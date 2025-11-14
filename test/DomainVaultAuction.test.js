import { expect } from "chai";
import hardhat from "hardhat";

const { ethers, fhevm } = hardhat;

describe("DomainVaultAuction", function () {
  let admin;
  let registrar;
  let gateway;
  let bidder;
  let challenger;
  let auction;
  let dropId;
  let contractAddress;

  beforeEach(async () => {
    [admin, registrar, gateway, bidder, challenger] = await ethers.getSigners();

    const DomainVaultFactory = await ethers.getContractFactory("DomainVaultAuction");
    auction = await DomainVaultFactory.connect(admin).deploy(gateway.address);
    await auction.waitForDeployment();
    contractAddress = await auction.getAddress();

    dropId = ethers.id("DOMAIN_VAULT_TEST_DROP");

    const currentBlock = await ethers.provider.getBlock("latest");
    if (!currentBlock) {
      throw new Error("Failed to fetch latest block");
    }
    const now = currentBlock.timestamp;
    const allowlist = now + 10;
    const biddingOpens = now + 20;
    const biddingCloses = now + 200;

    const reserve = await encrypt64(contractAddress, admin.address, 10n);

    await auction
      .connect(admin)
      .createDrop(
        dropId,
        registrar.address,
        allowlist,
        biddingOpens,
        biddingCloses,
        reserve.handles[0],
        reserve.inputProof
      );

    await advanceTime(biddingOpens + 1);
  });

  describe("bidding", () => {
    it("accepts encrypted bids and tracks the leader", async () => {
      const bidValue = 42n;
      const escrow = ethers.parseEther("1.0");
      const encryptedBid = await encrypt64(contractAddress, bidder.address, bidValue);
      const saltCommitment = ethers.keccak256(ethers.randomBytes(32));

      await expect(
        auction
          .connect(bidder)
          .submitBid(dropId, encryptedBid.handles[0], encryptedBid.inputProof, saltCommitment, { value: escrow })
      )
        .to.emit(auction, "BidSubmitted")
        .withArgs(dropId, bidder.address, saltCommitment, escrow);

      const envelope = await auction.getEnvelope(dropId, bidder.address);
      expect(envelope.exists).to.equal(true);
      expect(envelope.escrowedDeposit).to.equal(escrow);

      const leader = await auction.getLeadingBidder(dropId);
      expect(leader).to.equal(bidder.address);
    });

    it("stacks escrow when escalating bids", async () => {
      const firstBid = await encrypt64(contractAddress, bidder.address, 10n);
      const salt = ethers.keccak256(ethers.randomBytes(32));
      const escrow = ethers.parseEther("0.5");

      await auction
        .connect(bidder)
        .submitBid(dropId, firstBid.handles[0], firstBid.inputProof, salt, { value: escrow });

      const secondBid = await encrypt64(contractAddress, bidder.address, 22n);
      const extraEscrow = ethers.parseEther("0.25");

      await expect(
        auction
          .connect(bidder)
          .escalateBid(dropId, secondBid.handles[0], secondBid.inputProof, ethers.ZeroHash, { value: extraEscrow })
      )
        .to.emit(auction, "BidEscalated")
        .withArgs(dropId, bidder.address, salt, extraEscrow);

      const envelope = await auction.getEnvelope(dropId, bidder.address);
      expect(envelope.escrowedDeposit).to.equal(escrow + extraEscrow);
    });

    it("blocks duplicate salts to enforce fail-closed semantics", async () => {
      const salt = ethers.keccak256(ethers.randomBytes(32));
      const firstBid = await encrypt64(contractAddress, bidder.address, 18n);

      await auction
        .connect(bidder)
        .submitBid(dropId, firstBid.handles[0], firstBid.inputProof, salt, { value: ethers.parseEther("0.2") });

      const clonedBid = await encrypt64(contractAddress, challenger.address, 19n);
      await expect(
        auction
          .connect(challenger)
          .submitBid(dropId, clonedBid.handles[0], clonedBid.inputProof, salt, { value: ethers.parseEther("0.3") })
      ).to.be.revertedWithCustomError(auction, "DomainVault__DuplicateSalt");
    });
  });

  describe("reveal flow", () => {
    it("releases escrow to registrar after reveal", async () => {
      const salt = ethers.keccak256(ethers.randomBytes(32));
      const encryptedBid = await encrypt64(contractAddress, bidder.address, 55n);
      const escrow = ethers.parseEther("1.3");

      await auction
        .connect(bidder)
        .submitBid(dropId, encryptedBid.handles[0], encryptedBid.inputProof, salt, { value: escrow });

      const dropData = await auction.getDrop(dropId);
      const biddingCloses = Number(dropData[0].biddingCloses);
      await advanceTime(biddingCloses + 1);

      await expect(auction.connect(registrar).requestReveal(dropId))
        .to.emit(auction, "RevealRequested")
        .withArgs(dropId, registrar.address);

      const winningCipher = await encrypt64(contractAddress, gateway.address, 55n);

      await expect(
        auction
          .connect(gateway)
          .recordReveal(dropId, bidder.address, winningCipher.handles[0], winningCipher.inputProof)
      )
        .to.emit(auction, "RevealRecorded")
        .withArgs(dropId, bidder.address);

      const before = await ethers.provider.getBalance(registrar.address);

      const releaseTx = await auction.connect(registrar).releaseEscrow(dropId);
      const receipt = await releaseTx.wait();
      const gasSpent = receipt && receipt.gasUsed && receipt.gasPrice ? receipt.gasUsed * receipt.gasPrice : 0n;

      const after = await ethers.provider.getBalance(registrar.address);
      expect(after + gasSpent - before).to.equal(escrow);

      const envelope = await auction.getEnvelope(dropId, bidder.address);
      expect(envelope.escrowedDeposit).to.equal(0n);
      expect(envelope.revealed).to.equal(true);
    });

    it("allows losing bidders to reclaim escrow post reveal", async () => {
      const firstSalt = ethers.keccak256(ethers.randomBytes(32));
      const secondSalt = ethers.keccak256(ethers.randomBytes(32));

      const winnerBid = await encrypt64(contractAddress, bidder.address, 88n);
      await auction
        .connect(bidder)
        .submitBid(dropId, winnerBid.handles[0], winnerBid.inputProof, firstSalt, { value: ethers.parseEther("1") });

      const losingBid = await encrypt64(contractAddress, challenger.address, 66n);
      const losingEscrow = ethers.parseEther("0.75");
      await auction
        .connect(challenger)
        .submitBid(dropId, losingBid.handles[0], losingBid.inputProof, secondSalt, { value: losingEscrow });

      const dropData = await auction.getDrop(dropId);
      const biddingCloses = Number(dropData[0].biddingCloses);
      await advanceTime(biddingCloses + 1);

      await auction.connect(registrar).requestReveal(dropId);

      const winningCipher = await encrypt64(contractAddress, gateway.address, 88n);
      await auction
        .connect(gateway)
        .recordReveal(dropId, bidder.address, winningCipher.handles[0], winningCipher.inputProof);

      await auction.connect(registrar).releaseEscrow(dropId);

      await expect(auction.connect(challenger).reclaimEscrow(dropId))
        .to.emit(auction, "EscrowRefunded")
        .withArgs(dropId, challenger.address, losingEscrow);

      const envelope = await auction.getEnvelope(dropId, challenger.address);
      expect(envelope.escrowedDeposit).to.equal(0n);
      expect(envelope.revealed).to.equal(true);
    });
  });
});

async function encrypt64(contractAddress, caller, value) {
  const input = fhevm.createEncryptedInput(contractAddress, caller);
  input.add64(value);
  return input.encrypt();
}

async function advanceTime(targetTimestamp) {
  await ethers.provider.send("evm_setNextBlockTimestamp", [targetTimestamp]);
  await ethers.provider.send("evm_mine", []);
}
