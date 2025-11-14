// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title DomainVaultAuction - FHE-Powered Blind Auction for Premium Domains
/// @author DomainVault Team
/// @notice Implements encrypted blind bidding for premium domain drops using Zama fhEVM v0.9+
/// @dev All critical operations follow fail-closed defaults by reverting on invalid states
/// @custom:security-contact security@domainvault.io
contract DomainVaultAuction is ZamaEthereumConfig, ReentrancyGuard {
    /// -----------------------------------------------------------------------
    /// Custom Errors
    /// -----------------------------------------------------------------------

    error DomainVault__Unauthorized();
    error DomainVault__DropExists();
    error DomainVault__DropUnknown();
    error DomainVault__DropInactive();
    error DomainVault__InvalidSchedule();
    error DomainVault__AuctionClosed();
    error DomainVault__DuplicateSalt();
    error DomainVault__BidAlreadyExists();
    error DomainVault__BidMissing();
    error DomainVault__RevealNotRequested();
    error DomainVault__RevealAlreadyRecorded();
    error DomainVault__EscrowSettled();
    error DomainVault__EscrowMissing();
    error DomainVault__WinnerPending();
    error DomainVault__InvalidRecipient();
    error DomainVault__InvalidBidAmount();

    /// -----------------------------------------------------------------------
    /// Events
    /// -----------------------------------------------------------------------

    event DropCreated(
        bytes32 indexed dropId,
        address indexed registrar,
        uint64 allowlistOpens,
        uint64 biddingOpens,
        uint64 biddingCloses
    );

    event DropUpdated(bytes32 indexed dropId, uint64 biddingCloses);

    event DropCancelled(bytes32 indexed dropId);

    event BidSubmitted(
        bytes32 indexed dropId,
        address indexed bidder,
        bytes32 saltCommitment,
        uint256 escrowedAmount
    );

    event BidEscalated(
        bytes32 indexed dropId,
        address indexed bidder,
        bytes32 saltCommitment,
        uint256 additionalEscrow
    );

    event RevealRequested(bytes32 indexed dropId, address indexed requester);

    event RevealRecorded(bytes32 indexed dropId, address indexed winner);

    event EscrowReleased(bytes32 indexed dropId, address indexed recipient, uint256 amount);

    event EscrowRefunded(bytes32 indexed dropId, address indexed bidder, uint256 amount);

    /// -----------------------------------------------------------------------
    /// Storage Structures
    /// -----------------------------------------------------------------------

    /// @notice Configuration for each domain drop/auction
    struct DropConfig {
        address registrar; // Admin who can cancel & finalize
        uint64 allowlistOpens; // Allowlist check starts
        uint64 biddingOpens; // Bidding window opens
        uint64 biddingCloses; // Bidding window closes
        euint64 reserveCipher; // Encrypted minimum reserve price
        bool active; // Whether auction is still valid
    }

    /// @notice Sealed bid envelope for each bidder
    struct BidEnvelope {
        euint64 amountCipher; // Encrypted bid amount
        bytes32 saltCommitment; // keccak256(salt) to prevent replay
        uint256 escrowedDeposit; // Actual ETH locked by bidder
        bool exists; // Whether this bidder submitted a bid
        bool revealed; // Whether this bid was revealed (for future use)
    }

    /// @notice Settlement state after bidding closes
    struct SettlementInfo {
        address winner; // Winning bidder address
        euint64 winningBidCipher; // Encrypted winning bid amount
        bool revealRequested; // Whether reveal was requested
        bool revealRecorded; // Whether reveal was recorded
        bool escrowSettled; // Whether escrow was settled
    }

    /// -----------------------------------------------------------------------
    /// State Variables
    /// -----------------------------------------------------------------------

    /// @notice Admin with special privileges
    address public registrarAdmin;

    /// @notice Mapping: dropId => DropConfig
    mapping(bytes32 => DropConfig) private drops;

    /// @notice Mapping: dropId => bidder => BidEnvelope
    mapping(bytes32 => mapping(address => BidEnvelope)) private envelopes;

    /// @notice Mapping: dropId => SettlementInfo
    mapping(bytes32 => SettlementInfo) private settlements;

    /// @notice Mapping: dropId => Set of used salt commitments (prevents replay)
    mapping(bytes32 => mapping(bytes32 => bool)) private usedSalts;

    /// @notice Mapping: dropId => current highest bid (for internal tracking)
    mapping(bytes32 => euint64) private highestBids;

    /// @notice Mapping: dropId => current leading bidder
    mapping(bytes32 => address) private leadingBidders;

    /// -----------------------------------------------------------------------
    /// Constructor
    /// -----------------------------------------------------------------------

    constructor() {
        registrarAdmin = msg.sender;
    }

    /// -----------------------------------------------------------------------
    /// Modifiers
    /// -----------------------------------------------------------------------

    modifier onlyRegistrar() {
        if (msg.sender != registrarAdmin) revert DomainVault__Unauthorized();
        _;
    }

    /// -----------------------------------------------------------------------
    /// View Functions
    /// -----------------------------------------------------------------------

    /// @notice Get drop configuration
    /// @param dropId The unique identifier for the drop
    /// @return config The drop configuration
    /// @return settlement The settlement information
    function getDrop(bytes32 dropId)
        external
        view
        returns (DropConfig memory config, SettlementInfo memory settlement)
    {
        config = drops[dropId];
        settlement = settlements[dropId];
    }

    /// @notice Get bid envelope for a specific bidder
    /// @param dropId The unique identifier for the drop
    /// @param bidder The address of the bidder
    /// @return The bid envelope
    function getEnvelope(bytes32 dropId, address bidder) external view returns (BidEnvelope memory) {
        return envelopes[dropId][bidder];
    }

    /// @notice Get current highest encrypted bid
    /// @param dropId The unique identifier for the drop
    /// @return The encrypted highest bid
    function getHighestBid(bytes32 dropId) external view returns (euint64) {
        return highestBids[dropId];
    }

    /// @notice Get current leading bidder
    /// @param dropId The unique identifier for the drop
    /// @return The address of the leading bidder
    function getLeadingBidder(bytes32 dropId) external view returns (address) {
        return leadingBidders[dropId];
    }

    /// -----------------------------------------------------------------------
    /// Admin Functions
    /// -----------------------------------------------------------------------

    /// @notice Create a new domain drop/auction
    /// @param dropId Unique identifier for this drop
    /// @param registrar Address that can manage this drop
    /// @param allowlistOpens Timestamp when allowlist checking begins
    /// @param biddingOpens Timestamp when bidding opens
    /// @param biddingCloses Timestamp when bidding closes
    /// @param reserve Encrypted reserve price (externalEuint64)
    /// @param reserveProof ZK proof for the encrypted reserve price
    function createDrop(
        bytes32 dropId,
        address registrar,
        uint64 allowlistOpens,
        uint64 biddingOpens,
        uint64 biddingCloses,
        externalEuint64 reserve,
        bytes calldata reserveProof
    ) external onlyRegistrar {
        // Validate drop doesn't exist
        if (drops[dropId].active) revert DomainVault__DropExists();

        // Validate timeline
        if (allowlistOpens > biddingOpens || biddingOpens >= biddingCloses) {
            revert DomainVault__InvalidSchedule();
        }

        // Import and validate encrypted reserve price
        euint64 reserveCipher = FHE.fromExternal(reserve, reserveProof);

        // Store drop configuration
        drops[dropId] = DropConfig({
            registrar: registrar,
            allowlistOpens: allowlistOpens,
            biddingOpens: biddingOpens,
            biddingCloses: biddingCloses,
            reserveCipher: reserveCipher,
            active: true
        });

        // Set initial highest bid to reserve
        highestBids[dropId] = reserveCipher;

        // Grant contract access to the encrypted reserve
        FHE.allowThis(reserveCipher);
        FHE.allow(reserveCipher, msg.sender);

        emit DropCreated(dropId, registrar, allowlistOpens, biddingOpens, biddingCloses);
    }

    /// @notice Update drop schedule (extend bidding close time)
    /// @param dropId The drop to update
    /// @param newBiddingCloses New closing timestamp
    function updateDropSchedule(bytes32 dropId, uint64 newBiddingCloses) external {
        DropConfig storage drop = drops[dropId];
        if (!drop.active) revert DomainVault__DropInactive();
        if (msg.sender != drop.registrar) revert DomainVault__Unauthorized();
        if (newBiddingCloses <= drop.biddingCloses) revert DomainVault__InvalidSchedule();

        drop.biddingCloses = newBiddingCloses;
        emit DropUpdated(dropId, newBiddingCloses);
    }

    /// @notice Cancel a drop (before bidding closes)
    /// @param dropId The drop to cancel
    function cancelDrop(bytes32 dropId) external {
        DropConfig storage drop = drops[dropId];
        if (!drop.active) revert DomainVault__DropInactive();
        if (msg.sender != drop.registrar) revert DomainVault__Unauthorized();

        drop.active = false;
        emit DropCancelled(dropId);
    }

    /// -----------------------------------------------------------------------
    /// Bidding Functions
    /// -----------------------------------------------------------------------

    /// @notice Submit an encrypted bid with escrow deposit
    /// @param dropId The drop to bid on
    /// @param encryptedBid Encrypted bid amount (externalEuint64)
    /// @param bidProof ZK proof for the encrypted bid
    /// @param saltCommitment keccak256(salt) to prevent replay attacks
    function submitBid(
        bytes32 dropId,
        externalEuint64 encryptedBid,
        bytes calldata bidProof,
        bytes32 saltCommitment
    ) external payable nonReentrant {
        DropConfig storage drop = drops[dropId];

        // Validate drop is active and in bidding window
        if (!drop.active) revert DomainVault__DropInactive();
        if (block.timestamp < drop.biddingOpens || block.timestamp >= drop.biddingCloses) {
            revert DomainVault__AuctionClosed();
        }

        // Check bidder hasn't already submitted
        if (envelopes[dropId][msg.sender].exists) revert DomainVault__BidAlreadyExists();

        // Check salt hasn't been used
        if (usedSalts[dropId][saltCommitment]) revert DomainVault__DuplicateSalt();

        // Require non-zero escrow
        if (msg.value == 0) revert DomainVault__InvalidBidAmount();

        // Import encrypted bid
        euint64 bidCipher = FHE.fromExternal(encryptedBid, bidProof);

        // Store bid envelope
        envelopes[dropId][msg.sender] = BidEnvelope({
            amountCipher: bidCipher,
            saltCommitment: saltCommitment,
            escrowedDeposit: msg.value,
            exists: true,
            revealed: false
        });

        // Mark salt as used
        usedSalts[dropId][saltCommitment] = true;

        // Update highest bid if this bid is higher
        euint64 currentHighest = highestBids[dropId];
        ebool isHigher = FHE.gt(bidCipher, currentHighest);

        // Conditionally update highest bid and leading bidder
        highestBids[dropId] = FHE.select(isHigher, bidCipher, currentHighest);

        // Update leading bidder (encrypted condition)
        if (FHE.decrypt(isHigher)) {
            leadingBidders[dropId] = msg.sender;
        }

        // Grant permissions
        FHE.allowThis(bidCipher);
        FHE.allow(bidCipher, msg.sender);

        emit BidSubmitted(dropId, msg.sender, saltCommitment, msg.value);
    }

    /// @notice Escalate existing bid with additional escrow
    /// @param dropId The drop to escalate bid on
    /// @param upgradedBid New encrypted bid amount (must be higher)
    /// @param bidProof ZK proof for the new encrypted bid
    /// @param newSaltCommitment New salt commitment
    function escalateBid(
        bytes32 dropId,
        externalEuint64 upgradedBid,
        bytes calldata bidProof,
        bytes32 newSaltCommitment
    ) external payable nonReentrant {
        DropConfig storage drop = drops[dropId];

        // Validate drop is active and in bidding window
        if (!drop.active) revert DomainVault__DropInactive();
        if (block.timestamp < drop.biddingOpens || block.timestamp >= drop.biddingCloses) {
            revert DomainVault__AuctionClosed();
        }

        // Check bidder has existing bid
        BidEnvelope storage envelope = envelopes[dropId][msg.sender];
        if (!envelope.exists) revert DomainVault__BidMissing();

        // Check new salt hasn't been used
        if (usedSalts[dropId][newSaltCommitment]) revert DomainVault__DuplicateSalt();

        // Import new encrypted bid
        euint64 newBidCipher = FHE.fromExternal(upgradedBid, bidProof);

        // Update envelope
        envelope.amountCipher = newBidCipher;
        envelope.saltCommitment = newSaltCommitment;
        envelope.escrowedDeposit += msg.value;

        // Mark new salt as used
        usedSalts[dropId][newSaltCommitment] = true;

        // Update highest bid if this bid is higher
        euint64 currentHighest = highestBids[dropId];
        ebool isHigher = FHE.gt(newBidCipher, currentHighest);

        highestBids[dropId] = FHE.select(isHigher, newBidCipher, currentHighest);

        if (FHE.decrypt(isHigher)) {
            leadingBidders[dropId] = msg.sender;
        }

        // Grant permissions
        FHE.allowThis(newBidCipher);
        FHE.allow(newBidCipher, msg.sender);

        emit BidEscalated(dropId, msg.sender, newSaltCommitment, msg.value);
    }

    /// -----------------------------------------------------------------------
    /// Reveal & Settlement Functions
    /// -----------------------------------------------------------------------

    /// @notice Request reveal of winner (after bidding closes)
    /// @param dropId The drop to reveal
    function requestReveal(bytes32 dropId) external {
        DropConfig storage drop = drops[dropId];
        if (!drop.active) revert DomainVault__DropInactive();
        if (block.timestamp < drop.biddingCloses) revert DomainVault__AuctionClosed();

        SettlementInfo storage settlement = settlements[dropId];
        if (settlement.revealRequested) revert DomainVault__RevealAlreadyRecorded();

        settlement.revealRequested = true;
        emit RevealRequested(dropId, msg.sender);
    }

    /// @notice Record revealed winner (called by oracle/gateway)
    /// @param dropId The drop to record winner for
    /// @param winner The winning bidder address
    /// @param winningBid The encrypted winning bid amount
    /// @param proof ZK proof for the winning bid
    function recordReveal(
        bytes32 dropId,
        address winner,
        externalEuint64 winningBid,
        bytes calldata proof
    ) external onlyRegistrar {
        SettlementInfo storage settlement = settlements[dropId];
        if (!settlement.revealRequested) revert DomainVault__RevealNotRequested();
        if (settlement.revealRecorded) revert DomainVault__RevealAlreadyRecorded();

        euint64 winningBidCipher = FHE.fromExternal(winningBid, proof);

        settlement.winner = winner;
        settlement.winningBidCipher = winningBidCipher;
        settlement.revealRecorded = true;

        FHE.allowThis(winningBidCipher);
        FHE.allow(winningBidCipher, msg.sender);

        emit RevealRecorded(dropId, winner);
    }

    /// @notice Release escrow to winner
    /// @param dropId The drop to release escrow for
    function releaseEscrow(bytes32 dropId) external nonReentrant {
        DropConfig storage drop = drops[dropId];
        if (msg.sender != drop.registrar) revert DomainVault__Unauthorized();

        SettlementInfo storage settlement = settlements[dropId];
        if (!settlement.revealRecorded) revert DomainVault__WinnerPending();
        if (settlement.escrowSettled) revert DomainVault__EscrowSettled();

        address winner = settlement.winner;
        if (winner == address(0)) revert DomainVault__InvalidRecipient();

        BidEnvelope storage winnerEnvelope = envelopes[dropId][winner];
        if (!winnerEnvelope.exists) revert DomainVault__EscrowMissing();

        uint256 amount = winnerEnvelope.escrowedDeposit;
        settlement.escrowSettled = true;

        // Transfer escrow to registrar
        payable(drop.registrar).transfer(amount);

        emit EscrowReleased(dropId, drop.registrar, amount);
    }

    /// @notice Reclaim escrow (for losing bidders or cancelled drops)
    /// @param dropId The drop to reclaim escrow from
    function reclaimEscrow(bytes32 dropId) external nonReentrant {
        DropConfig storage drop = drops[dropId];
        BidEnvelope storage envelope = envelopes[dropId][msg.sender];

        if (!envelope.exists) revert DomainVault__EscrowMissing();

        // Can reclaim if: (1) drop cancelled, or (2) not the winner and reveal recorded
        bool canReclaim = !drop.active
            || (settlements[dropId].revealRecorded && settlements[dropId].winner != msg.sender);

        if (!canReclaim) revert DomainVault__Unauthorized();

        uint256 amount = envelope.escrowedDeposit;
        envelope.escrowedDeposit = 0;

        payable(msg.sender).transfer(amount);

        emit EscrowRefunded(dropId, msg.sender, amount);
    }
}
