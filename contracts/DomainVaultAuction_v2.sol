// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, eaddress, ebool, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title DomainVaultAuction - Sealed bid auctions using fhEVM 0.9.x
/// @notice Multi-auction manager keeping the highest bid & winner encrypted until finalized.
contract DomainVaultAuction is ZamaEthereumConfig, ReentrancyGuard {
    /// -----------------------------------------------------------------------
    /// Events
    /// -----------------------------------------------------------------------
    event AuctionCreated(
        bytes32 indexed auctionId,
        address indexed seller,
        uint64 biddingOpens,
        uint64 biddingCloses,
        string domainName
    );

    event BidPlaced(bytes32 indexed auctionId, address indexed bidder);
    event AuctionFinalized(bytes32 indexed auctionId, address indexed seller);
    event ViewGranted(bytes32 indexed auctionId, address indexed viewer);

    /// -----------------------------------------------------------------------
    /// Errors
    /// -----------------------------------------------------------------------
    error DomainVault__Unauthorized();
    error DomainVault__AuctionExists();
    error DomainVault__AuctionUnknown();
    error DomainVault__AuctionActive();
    error DomainVault__AuctionInactive();
    error DomainVault__BiddingClosed();
    error DomainVault__InvalidDuration();

    /// -----------------------------------------------------------------------
    /// Storage
    /// -----------------------------------------------------------------------
    struct AuctionConfig {
        address seller;
        string domain;
        uint64 biddingOpens;
        uint64 biddingCloses;
        uint64 startingBidWei;
        uint32 bidCount;
        bool ended;
        bool exists;
    }

    address public registrarAdmin;

    mapping(bytes32 => AuctionConfig) private auctions;
    bytes32[] private auctionIds;

    mapping(bytes32 => euint64) private highestBidCipher;
    mapping(bytes32 => eaddress) private winnerCipher;
    mapping(bytes32 => mapping(address => bool)) public canView;

    constructor() {
        registrarAdmin = msg.sender;
    }

    modifier onlyRegistrar() {
        if (msg.sender != registrarAdmin) revert DomainVault__Unauthorized();
        _;
    }

    /// -----------------------------------------------------------------------
    /// Auction lifecycle
    /// -----------------------------------------------------------------------

    /// @notice Create a new auction that starts immediately and lasts `durationSeconds`.
    function createAuction(
        bytes32 auctionId,
        string calldata domain,
        uint64 durationSeconds,
        uint64 startingBidWei
    ) external onlyRegistrar {
        if (auctions[auctionId].exists) revert DomainVault__AuctionExists();
        if (durationSeconds < 3600) revert DomainVault__InvalidDuration();

        uint64 opens = uint64(block.timestamp);
        uint64 closes = opens + durationSeconds;

        auctions[auctionId] = AuctionConfig({
            seller: msg.sender,
            domain: domain,
            biddingOpens: opens,
            biddingCloses: closes,
            startingBidWei: startingBidWei,
            bidCount: 0,
            ended: false,
            exists: true
        });

        auctionIds.push(auctionId);
        canView[auctionId][msg.sender] = true;

        emit AuctionCreated(auctionId, msg.sender, opens, closes, domain);
    }

    /// @notice Place an encrypted bid (strictly sealed, no escrow required)
    function placeBid(
        bytes32 auctionId,
        externalEuint64 bidCipher,
        bytes calldata proof
    ) external nonReentrant {
        AuctionConfig storage config = auctions[auctionId];
        if (!config.exists) revert DomainVault__AuctionUnknown();
        if (config.ended) revert DomainVault__AuctionInactive();
        if (block.timestamp < config.biddingOpens || block.timestamp >= config.biddingCloses) {
            revert DomainVault__BiddingClosed();
        }

        euint64 bid = FHE.fromExternal(bidCipher, proof);

        if (FHE.isInitialized(highestBidCipher[auctionId])) {
            ebool better = FHE.lt(highestBidCipher[auctionId], bid);
            highestBidCipher[auctionId] = FHE.select(better, bid, highestBidCipher[auctionId]);
            winnerCipher[auctionId] = FHE.select(
                better,
                FHE.asEaddress(msg.sender),
                winnerCipher[auctionId]
            );
        } else {
            highestBidCipher[auctionId] = bid;
            winnerCipher[auctionId] = FHE.asEaddress(msg.sender);
        }

        FHE.allowThis(highestBidCipher[auctionId]);
        FHE.allowThis(winnerCipher[auctionId]);

        canView[auctionId][msg.sender] = true;
        unchecked {
            config.bidCount += 1;
        }

        emit BidPlaced(auctionId, msg.sender);
    }

    /// @notice Finalize the auction. Can be called by anyone after bidding closes.
    function finalizeAuction(bytes32 auctionId) external {
        AuctionConfig storage config = auctions[auctionId];
        if (!config.exists) revert DomainVault__AuctionUnknown();
        if (config.ended) revert DomainVault__AuctionInactive();
        if (block.timestamp < config.biddingCloses) revert DomainVault__BiddingClosed();

        config.ended = true;

        if (config.bidCount > 0) {
            FHE.allow(highestBidCipher[auctionId], config.seller);
            FHE.allow(winnerCipher[auctionId], config.seller);
        }

        emit AuctionFinalized(auctionId, config.seller);
    }

    /// @notice Seller can share encrypted result with other viewers post-finalization.
    function grantView(bytes32 auctionId, address viewer) external {
        AuctionConfig storage config = auctions[auctionId];
        if (!config.exists) revert DomainVault__AuctionUnknown();
        if (!config.ended) revert DomainVault__AuctionActive();
        if (config.seller != msg.sender) revert DomainVault__Unauthorized();

        canView[auctionId][viewer] = true;
        if (config.bidCount > 0) {
            FHE.allow(highestBidCipher[auctionId], viewer);
            FHE.allow(winnerCipher[auctionId], viewer);
        }

        emit ViewGranted(auctionId, viewer);
    }

    /// -----------------------------------------------------------------------
    /// Views
    /// -----------------------------------------------------------------------

    function getAuction(bytes32 auctionId) external view returns (AuctionConfig memory) {
        AuctionConfig memory config = auctions[auctionId];
        if (!config.exists) revert DomainVault__AuctionUnknown();
        return config;
    }

    function getAuctionIds() external view returns (bytes32[] memory) {
        return auctionIds;
    }

    function highestBid(bytes32 auctionId) external view returns (euint64) {
        AuctionConfig memory config = auctions[auctionId];
        if (!config.exists || !config.ended) revert DomainVault__AuctionActive();
        if (!canView[auctionId][msg.sender]) revert DomainVault__Unauthorized();
        return highestBidCipher[auctionId];
    }

    function winner(bytes32 auctionId) external view returns (eaddress) {
        AuctionConfig memory config = auctions[auctionId];
        if (!config.exists || !config.ended) revert DomainVault__AuctionActive();
        if (!canView[auctionId][msg.sender]) revert DomainVault__Unauthorized();
        return winnerCipher[auctionId];
    }
}
