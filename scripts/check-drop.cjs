#!/usr/bin/env node
/* eslint-disable no-console */
const hre = require("hardhat");
const { keccak256, toUtf8Bytes } = require("ethers");

/**
 * Check if a drop exists for a given domain
 */
async function main() {
  const contractAddress = "0xa4Ccd9166E5A3373FA0E0Dc2145a90c37066abAA";
  const testDomain = process.argv[2] || "test.eth";

  console.log("[check-drop] Checking domain:", testDomain);
  console.log("[check-drop] Contract:", contractAddress);

  const contract = await hre.ethers.getContractAt("DomainVaultAuction", contractAddress);

  // Generate dropId the same way as frontend
  const dropId = keccak256(toUtf8Bytes(testDomain));
  console.log("[check-drop] DropId:", dropId);

  try {
    const dropData = await contract.getDrop(dropId);
    console.log("\n=== Drop Data ===");
    console.log("Registrar:", dropData.config.registrar);
    console.log("Active:", dropData.config.active);
    console.log("AllowlistOpens:", dropData.config.allowlistOpens.toString());
    console.log("BiddingOpens:", dropData.config.biddingOpens.toString());
    console.log("BiddingCloses:", dropData.config.biddingCloses.toString());

    if (dropData.config.active) {
      console.log("\n❌ This drop already exists and is active!");
      console.log("   Use a different domain name or wait for this auction to end.");
    } else if (dropData.config.registrar !== "0x0000000000000000000000000000000000000000") {
      console.log("\n⚠️ This drop exists but is no longer active.");
    }
  } catch (error) {
    if (error.message.includes("DomainVault__DropUnknown")) {
      console.log("\n✅ This drop does not exist - safe to create!");
    } else {
      console.error("\n❌ Error checking drop:", error.message);
    }
  }
}

main().catch((error) => {
  console.error("[check-drop] Error:", error);
  process.exitCode = 1;
});
