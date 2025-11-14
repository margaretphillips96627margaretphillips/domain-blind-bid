#!/usr/bin/env node
/* eslint-disable no-console */
const hre = require("hardhat");

/**
 * Check which addresses have permission to create drops
 */
async function main() {
  const contractAddress = "0xa4Ccd9166E5A3373FA0E0Dc2145a90c37066abAA";

  console.log("[check-wallet] Contract:", contractAddress);

  const contract = await hre.ethers.getContractAt("DomainVaultAuction", contractAddress);

  const registrarAdmin = await contract.registrarAdmin();
  const gatewaySigner = await contract.gatewaySigner();

  console.log("\n=== Authorized Addresses ===");
  console.log("registrarAdmin (can create drops):", registrarAdmin);
  console.log("gatewaySigner (can record reveals):", gatewaySigner);

  // Get the current signer
  const [signer] = await hre.ethers.getSigners();
  console.log("\n=== Your Current Wallet ===");
  console.log("Address:", signer.address);

  // Check permissions
  console.log("\n=== Permission Check ===");
  if (signer.address.toLowerCase() === registrarAdmin.toLowerCase()) {
    console.log("✅ You CAN create drops with this wallet");
  } else {
    console.log("❌ You CANNOT create drops with this wallet");
    console.log("   You need to use:", registrarAdmin);
  }

  // List all addresses from .env
  console.log("\n=== Environment Configuration ===");
  console.log("DOMAINVAULT_GATEWAY_SIGNER:", process.env.DOMAINVAULT_GATEWAY_SIGNER);
}

main().catch((error) => {
  console.error("[check-wallet] Error:", error);
  process.exitCode = 1;
});
