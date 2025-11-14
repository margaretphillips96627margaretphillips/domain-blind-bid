#!/usr/bin/env node
/* eslint-disable no-console */
const hre = require("hardhat");
const { keccak256, toUtf8Bytes, parseEther } = require("ethers");

/**
 * Test creating a drop directly with hardhat
 */
async function main() {
  const contractAddress = "0xa4Ccd9166E5A3373FA0E0Dc2145a90c37066abAA";

  console.log("[test] Using contract:", contractAddress);

  const contract = await hre.ethers.getContractAt("DomainVaultAuction", contractAddress);
  const [signer] = await hre.ethers.getSigners();

  console.log("[test] Signer:", signer.address);

  // Generate test parameters
  const domain = "test-" + Date.now() + ".eth";
  const dropId = keccak256(toUtf8Bytes(domain));
  const registrar = signer.address;

  const now = Math.floor(Date.now() / 1000);
  const allowlistOpens = now + 60; // 1 minute from now
  const biddingOpens = now + 60;   // Same as allowlist
  const biddingCloses = now + 7200; // 2 hours from now

  console.log("\n=== Test Parameters ===");
  console.log("Domain:", domain);
  console.log("DropId:", dropId);
  console.log("Registrar:", registrar);
  console.log("AllowlistOpens:", allowlistOpens, new Date(allowlistOpens * 1000).toISOString());
  console.log("BiddingOpens:", biddingOpens, new Date(biddingOpens * 1000).toISOString());
  console.log("BiddingCloses:", biddingCloses, new Date(biddingCloses * 1000).toISOString());

  // Check time ordering
  console.log("\n=== Time Validation ===");
  console.log("allowlistOpens <= biddingOpens:", allowlistOpens <= biddingOpens);
  console.log("biddingOpens < biddingCloses:", biddingOpens < biddingCloses);
  console.log("Duration:", biddingCloses - biddingOpens, "seconds");

  // For testing without FHE, we'll use a mock reserve
  // In real scenario, you'd need to initialize FHE and encrypt
  console.log("\n⚠️  This test will FAIL because we need actual FHE encryption");
  console.log("The reserve and proof need to come from the FHE SDK");
  console.log("But we can verify the transaction gets to the contract correctly");

  // Use dummy values (this will fail at contract level but helps test other params)
  const dummyReserve = "0x0000000000000000000000000000000000000000000000000000000000000001";
  const dummyProof = "0x00";

  try {
    console.log("\n=== Attempting to create drop (will fail without real FHE data) ===");
    const tx = await contract.createDrop(
      dropId,
      registrar,
      allowlistOpens,
      biddingOpens,
      biddingCloses,
      dummyReserve,
      dummyProof,
      {
        gasLimit: 10000000
      }
    );

    console.log("Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("Transaction confirmed:", receipt.status === 1 ? "Success" : "Failed");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.message.includes("DomainVault__")) {
      console.log("\n💡 This is a known contract error:");
      console.log("   - DomainVault__Unauthorized: Wrong wallet");
      console.log("   - DomainVault__DropExists: Drop already exists");
      console.log("   - DomainVault__InvalidSchedule: Time ordering wrong");
      console.log("   - Other: Check contract requirements");
    }
  }
}

main().catch((error) => {
  console.error("[test] Error:", error);
  process.exitCode = 1;
});
