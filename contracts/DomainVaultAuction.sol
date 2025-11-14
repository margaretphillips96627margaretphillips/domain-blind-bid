// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title DomainVaultAuction
/// @author DomainVault engineering
/// @notice Implements encrypted blind bidding for premium domain drops using Zama fhEVM.
/// @dev All critical operations follow fail-closed defaults by reverting on invalid states.
contract DomainVaultAuction is SepoliaConfig, ReentrancyGuard {
    /// -----------------------------------------------------------------------
    /// Errors
    /// -----------------------------------------------------------------------

    error DomainVault__Unauthorized();
    error DomainVault__GatewayUnset();
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

    /// -----------------------------------------------------------------------
    /// Events
    /// -----------------------------------------------------------------------

    event DropCreated(bytes32 indexed dropId, address indexed registrar, uint64 allowlistOpens, uint64 biddingOpens, uint64 biddingCloses);
    event DropUpdated(bytes32 indexed dropId, uint64 biddingCloses);
    event DropCancelled(bytes32 indexed dropId);
    event BidSubmitted(bytes32 indexed dropId, address indexed bidder, bytes32 saltCommitment, uint256 escrowedAmount);
    event BidEscalated(bytes32 indexed dropId, address indexed bidder, bytes32 saltCommitment, uint256 additionalEscrow);
    event RevealRequested(bytes32 indexed dropId, address indexed requester);
    event RevealRecorded(bytes32 indexed dropId, address indexed winner);
    event EscrowReleased(bytes32 indexed dropId, address indexed recipient, uint256 amount);
    event EscrowRefunded(bytes32 indexed dropId, address indexed bidder, uint256 amount);
    event GatewayUpdated(address indexed newGateway);

    /// -----------------------------------------------------------------------
    /// Storage
    /// -----------------------------------------------------------------------

    struct DropConfig {
        address registrar; // Drop owner controlling allowlists and reveals
        uint64 allowlistOpens; // Timestamp when allowlist invites can be processed
        uint64 biddingOpens; // Timestamp when encrypted bids are accepted
        uint64 biddingCloses; // Timestamp when bidding closes
        euint64 reserveCipher; // Encrypted reserve threshold
        bool active; // True when drop can receive bids
    }

    struct BidEnvelope {
        euint64 amountCipher; // Encrypted bid amount handle
        bytes32 saltCommitment; // Hashed salt preventing duplicate submissions
        uint256 escrowedDeposit; // ETH held in escrow for reveal settlement
        bool exists; // Tracks whether bidder submitted a bid
        bool revealed; // True once reveal is complete for the bidder
    }

    struct SettlementInfo {
        address winner; // Winner address provided by gateway reveal
        euint64 winningBidCipher; // Encrypted winning bid handle
        bool revealRequested; // True once registrar asked the gateway to reveal
        bool revealRecorded; // True once the gateway reports the result
        bool escrowSettled; // True after funds are released to registrar
    }

    address public immutable registrarAdmin; // Multisig or owner controlling drop lifecycle
    address public gatewaySigner; // Trusted gateway responsible for reveal attestations

    mapping(bytes32 => DropConfig) private drops; // Drop registry
    mapping(bytes32 => mapping(address => BidEnvelope)) private envelopes; // Bid envelopes per drop and bidder
    mapping(bytes32 => mapping(bytes32 => bool)) private saltRegistry; // salt hashes seen per drop
    mapping(bytes32 => euint64) private highestBidCipher; // Rolling encrypted max bid per drop
    mapping(bytes32 => address) private leadingBidder; // Latest account setting the encrypted max
    mapping(bytes32 => SettlementInfo) private settlements; // Reveal metadata

    /// -----------------------------------------------------------------------
    /// Constructor
    /// -----------------------------------------------------------------------

    constructor(address initialGatewaySigner) {
        if (initialGatewaySigner == address(0)) revert DomainVault__InvalidRecipient();
        registrarAdmin = msg.sender;
        gatewaySigner = initialGatewaySigner;
        emit GatewayUpdated(initialGatewaySigner);
    }

    /// -----------------------------------------------------------------------
    /// Modifiers
    /// -----------------------------------------------------------------------

    modifier onlyRegistrar() {
        if (msg.sender != registrarAdmin) revert DomainVault__Unauthorized();
        _;
    }

    modifier onlyGateway() {
        if (msg.sender != gatewaySigner) revert DomainVault__Unauthorized();
        _;
    }

    /// -----------------------------------------------------------------------
    /// Administrative actions
    /// -----------------------------------------------------------------------

    /// @notice Updates the trusted gateway signer authorised to post reveal results.
    /// @param newGateway Address of the new gateway signer.
    function updateGatewaySigner(address newGateway) external onlyRegistrar {
        if (newGateway == address(0)) revert DomainVault__InvalidRecipient();
        gatewaySigner = newGateway;
        emit GatewayUpdated(newGateway);
    }

    /// @notice Registers a new encrypted domain drop.
    /// @param dropId Unique identifier for the drop.
    /// @param registrar Address controlling the drop and authorised reveals.
    /// @param allowlistOpens Timestamp for allowlist operations.
    /// @param biddingOpens Timestamp when encrypted bids can be submitted.
    /// @param biddingCloses Timestamp when bidding ends.
    /// @param reserve External encrypted reserve threshold provided by the frontend.
    /// @param reserveProof zk-proof attesting to the encrypted reserve value.
    function createDrop(
        bytes32 dropId,
        address registrar,
        uint64 allowlistOpens,
        uint64 biddingOpens,
        uint64 biddingCloses,
        externalEuint64 reserve,
        bytes calldata reserveProof
    ) external onlyRegistrar {
        if (drops[dropId].active) revert DomainVault__DropExists();
        if (registrar == address(0)) revert DomainVault__InvalidRecipient();
        if (!(allowlistOpens <= biddingOpens && biddingOpens < biddingCloses)) revert DomainVault__InvalidSchedule();

        euint64 reserveCipher = FHE.fromExternal(reserve, reserveProof);
        // Fail-closed: authorise contract and registrar immediately after import.
        FHE.allowThis(reserveCipher);
        FHE.allow(reserveCipher, registrar);
        FHE.allow(reserveCipher, registrarAdmin);

        drops[dropId] = DropConfig({
            registrar: registrar,
            allowlistOpens: allowlistOpens,
            biddingOpens: biddingOpens,
            biddingCloses: biddingCloses,
            reserveCipher: reserveCipher,
            active: true
        });

        euint64 zero = FHE.asEuint64(0);
        FHE.allowThis(zero);
        highestBidCipher[dropId] = zero;
        leadingBidder[dropId] = address(0);

        euint64 zeroForSettlement = FHE.asEuint64(0);
        FHE.allowThis(zeroForSettlement);
        settlements[dropId] = SettlementInfo({
            winner: address(0),
            winningBidCipher: zeroForSettlement,
            revealRequested: false,
            revealRecorded: false,
            escrowSettled: false
        });

        emit DropCreated(dropId, registrar, allowlistOpens, biddingOpens, biddingCloses);
    }

    /// @notice Allows the registrar to postpone the bidding close timestamp.
    /// @param dropId Identifier of the drop.
    /// @param newBiddingCloses New bidding close timestamp.
    function updateDropSchedule(bytes32 dropId, uint64 newBiddingCloses) external onlyRegistrar {
        DropConfig storage drop = drops[dropId];
        if (!drop.active) revert DomainVault__DropUnknown();
        if (newBiddingCloses <= drop.biddingOpens) revert DomainVault__InvalidSchedule();
        drop.biddingCloses = newBiddingCloses;
        emit DropUpdated(dropId, newBiddingCloses);
    }

    /// @notice Cancels an active drop and halts new bids.
    /// @param dropId Identifier of the drop.
    function cancelDrop(bytes32 dropId) external onlyRegistrar {
        DropConfig storage drop = drops[dropId];
        if (!drop.active) revert DomainVault__DropUnknown();
        drop.active = false;
        emit DropCancelled(dropId);
    }

    /// -----------------------------------------------------------------------
    /// Bidding lifecycle
    /// -----------------------------------------------------------------------

    /// @notice Submits a new encrypted bid together with escrow collateral.
    /// @dev The function is fail-closed: zero escrow reverts and duplicate salts are blocked.
    /// @param dropId Identifier of the active drop.
    /// @param encryptedBid External encrypted bid handle supplied by the SDK.
    /// @param bidProof zk-proof authenticating the ciphertext.
    /// @param saltCommitment Hashed salt to prevent duplicate submissions.
    function submitBid(
        bytes32 dropId,
        externalEuint64 encryptedBid,
        bytes calldata bidProof,
        bytes32 saltCommitment
    ) external payable nonReentrant {
        DropConfig storage drop = drops[dropId];
        if (!drop.active) revert DomainVault__DropInactive();
        if (block.timestamp < drop.biddingOpens || block.timestamp > drop.biddingCloses) revert DomainVault__AuctionClosed();
        if (saltRegistry[dropId][saltCommitment]) revert DomainVault__DuplicateSalt();
        if (envelopes[dropId][msg.sender].exists) revert DomainVault__BidAlreadyExists();
        if (msg.value == 0) revert DomainVault__EscrowMissing();

        euint64 bidCipher = FHE.fromExternal(encryptedBid, bidProof);
        FHE.allowThis(bidCipher);
        FHE.allow(bidCipher, msg.sender);
        FHE.allow(bidCipher, drop.registrar);
        FHE.allow(bidCipher, registrarAdmin);

        BidEnvelope storage envelope = envelopes[dropId][msg.sender];
        envelope.amountCipher = bidCipher;
        envelope.saltCommitment = saltCommitment;
        envelope.escrowedDeposit = msg.value;
        envelope.exists = true;
        envelope.revealed = false;

        saltRegistry[dropId][saltCommitment] = true;

        euint64 updatedMax = FHE.max(highestBidCipher[dropId], bidCipher);
        FHE.allowThis(updatedMax);
        FHE.allow(updatedMax, drop.registrar);
        FHE.allow(updatedMax, registrarAdmin);
        highestBidCipher[dropId] = updatedMax;
        leadingBidder[dropId] = msg.sender;

        emit BidSubmitted(dropId, msg.sender, saltCommitment, msg.value);
    }

    /// @notice Escalates an existing bid by submitting a new ciphertext and optional extra escrow.
    /// @param dropId Identifier of the drop.
    /// @param upgradedBid Updated encrypted bid handle.
    /// @param bidProof zk-proof for the updated ciphertext.
    /// @param newSaltCommitment Optional new salt hash. Set to zero hash to retain previous salt.
    function escalateBid(
        bytes32 dropId,
        externalEuint64 upgradedBid,
        bytes calldata bidProof,
        bytes32 newSaltCommitment
    ) external payable nonReentrant {
        DropConfig storage drop = drops[dropId];
        if (!drop.active) revert DomainVault__DropInactive();
        if (block.timestamp < drop.biddingOpens || block.timestamp > drop.biddingCloses) revert DomainVault__AuctionClosed();

        BidEnvelope storage envelope = envelopes[dropId][msg.sender];
        if (!envelope.exists) revert DomainVault__BidMissing();
        if (envelope.revealed) revert DomainVault__EscrowSettled();

        if (newSaltCommitment != bytes32(0) && newSaltCommitment != envelope.saltCommitment) {
            if (saltRegistry[dropId][newSaltCommitment]) revert DomainVault__DuplicateSalt();
            saltRegistry[dropId][newSaltCommitment] = true;
            envelope.saltCommitment = newSaltCommitment;
        }

        if (msg.value > 0) {
            envelope.escrowedDeposit += msg.value;
        }

        euint64 bidCipher = FHE.fromExternal(upgradedBid, bidProof);
        FHE.allowThis(bidCipher);
        FHE.allow(bidCipher, msg.sender);
        FHE.allow(bidCipher, drop.registrar);
        FHE.allow(bidCipher, registrarAdmin);

        envelope.amountCipher = bidCipher;

        euint64 updatedMax = FHE.max(highestBidCipher[dropId], bidCipher);
        FHE.allowThis(updatedMax);
        FHE.allow(updatedMax, drop.registrar);
        FHE.allow(updatedMax, registrarAdmin);
        highestBidCipher[dropId] = updatedMax;
        leadingBidder[dropId] = msg.sender;

        emit BidEscalated(dropId, msg.sender, envelope.saltCommitment, msg.value);
    }

    /// -----------------------------------------------------------------------
    /// Reveal flow
    /// -----------------------------------------------------------------------

    /// @notice Requests the reveal from the trusted gateway once the auction ends.
    /// @param dropId Identifier of the drop.
    function requestReveal(bytes32 dropId) external {
        DropConfig storage drop = drops[dropId];
        if (msg.sender != drop.registrar && msg.sender != registrarAdmin) revert DomainVault__Unauthorized();
        if (!drop.active) revert DomainVault__DropInactive();
        if (block.timestamp <= drop.biddingCloses) revert DomainVault__AuctionClosed();

        SettlementInfo storage settlement = settlements[dropId];
        settlement.revealRequested = true;
        emit RevealRequested(dropId, msg.sender);
    }

    /// @notice Records the reveal result provided by the off-chain gateway.
    /// @dev The gateway must supply the encrypted winning bid handle together with its proof.
    /// @param dropId Identifier of the drop.
    /// @param winner Account designated as auction winner.
    /// @param winningBid External encrypted winning bid handle.
    /// @param proof zk-proof authenticating the winning bid ciphertext.
    function recordReveal(
        bytes32 dropId,
        address winner,
        externalEuint64 winningBid,
        bytes calldata proof
    ) external onlyGateway {
        if (winner == address(0)) revert DomainVault__InvalidRecipient();

        DropConfig storage drop = drops[dropId];
        if (!drop.active) revert DomainVault__DropInactive();

        SettlementInfo storage settlement = settlements[dropId];
        if (!settlement.revealRequested) revert DomainVault__RevealNotRequested();
        if (settlement.revealRecorded) revert DomainVault__RevealAlreadyRecorded();

        euint64 winningCipher = FHE.fromExternal(winningBid, proof);
        FHE.allowThis(winningCipher);
        FHE.allow(winningCipher, winner);
        FHE.allow(winningCipher, drop.registrar);
        FHE.allow(winningCipher, registrarAdmin);

        settlement.winner = winner;
        settlement.winningBidCipher = winningCipher;
        settlement.revealRecorded = true;

        leadingBidder[dropId] = winner;

        emit RevealRecorded(dropId, winner);
    }

    /// @notice Releases escrow funds to the registrar after a successful reveal.
    /// @param dropId Identifier of the drop.
    function releaseEscrow(bytes32 dropId) external nonReentrant {
        DropConfig storage drop = drops[dropId];
        if (msg.sender != drop.registrar && msg.sender != registrarAdmin) revert DomainVault__Unauthorized();

        SettlementInfo storage settlement = settlements[dropId];
        if (!settlement.revealRecorded) revert DomainVault__RevealNotRequested();
        if (settlement.escrowSettled) revert DomainVault__EscrowSettled();

        BidEnvelope storage winnerEnvelope = envelopes[dropId][settlement.winner];
        if (!winnerEnvelope.exists) revert DomainVault__BidMissing();
        if (winnerEnvelope.escrowedDeposit == 0) revert DomainVault__EscrowMissing();

        uint256 payout = winnerEnvelope.escrowedDeposit;
        winnerEnvelope.escrowedDeposit = 0;
        winnerEnvelope.revealed = true;
        settlement.escrowSettled = true;

        (bool ok, ) = payable(drop.registrar).call{value: payout}("");
        if (!ok) revert DomainVault__InvalidRecipient();

        emit EscrowReleased(dropId, drop.registrar, payout);
    }

    /// @notice Allows losing bidders or cancelled drops to collect their escrow.
    /// @param dropId Identifier of the drop.
    function reclaimEscrow(bytes32 dropId) external nonReentrant {
        DropConfig storage drop = drops[dropId];
        BidEnvelope storage envelope = envelopes[dropId][msg.sender];
        if (!envelope.exists) revert DomainVault__BidMissing();
        if (envelope.escrowedDeposit == 0) revert DomainVault__EscrowMissing();

        SettlementInfo storage settlement = settlements[dropId];
        if (settlement.revealRecorded && settlement.winner == msg.sender && !settlement.escrowSettled) {
            revert DomainVault__WinnerPending();
        }

        bool dropInactive = !drop.active;
        bool biddingClosed = block.timestamp > drop.biddingCloses;
        bool eligible = dropInactive || settlement.revealRecorded || biddingClosed;
        if (!eligible) revert DomainVault__AuctionClosed();

        uint256 refund = envelope.escrowedDeposit;
        envelope.escrowedDeposit = 0;
        envelope.revealed = true;

        (bool ok, ) = payable(msg.sender).call{value: refund}("");
        if (!ok) revert DomainVault__InvalidRecipient();

        emit EscrowRefunded(dropId, msg.sender, refund);
    }

    /// -----------------------------------------------------------------------
    /// View helpers
    /// -----------------------------------------------------------------------

    /// @notice Returns drop metadata for frontend consumption.
    function getDrop(bytes32 dropId) external view returns (DropConfig memory config, SettlementInfo memory settlement) {
        config = drops[dropId];
        settlement = settlements[dropId];
    }

    /// @notice Returns the encrypted highest bid handle for a drop.
    function getHighestBid(bytes32 dropId) external view returns (euint64) {
        return highestBidCipher[dropId];
    }

    /// @notice Returns data for the caller's envelope.
    function getEnvelope(bytes32 dropId, address bidder) external view returns (BidEnvelope memory) {
        return envelopes[dropId][bidder];
    }

    /// @notice Accessor exposing the currently recorded leading bidder.
    function getLeadingBidder(bytes32 dropId) external view returns (address) {
        return leadingBidder[dropId];
    }
}
