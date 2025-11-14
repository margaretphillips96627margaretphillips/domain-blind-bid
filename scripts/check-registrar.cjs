#!/usr/bin/env node
/* eslint-disable no-console */
const hre = require("hardhat");

/**
 * Check the registrarAdmin address of the deployed contract
 */
async function main() {
  const contractAddress = "0xa4Ccd9166E5A3373FA0E0Dc2145a90c37066abAA";

  console.log("[check] Checking contract at:", contractAddress);
  console.log("[check] Network:", hre.network.name);

  const contract = await hre.ethers.getContractAt("DomainVaultAuction", contractAddress);

  const registrarAdmin = await contract.registrarAdmin();
  const gatewaySigner = await contract.gatewaySigner();

  console.log("\n=== Contract Configuration ===");
  console.log("registrarAdmin:", registrarAdmin);
  console.log("gatewaySigner:", gatewaySigner);

  // Check from .env
  console.log("\n=== Environment Variables ===");
  console.log("DOMAINVAULT_GATEWAY_SIGNER:", process.env.DOMAINVAULT_GATEWAY_SIGNER);

  // Get the signer address (the address sending transactions)
  const [signer] = await hre.ethers.getSigners();
  console.log("\n=== Current Signer ===");
  console.log("Current signer address:", signer.address);

  // Check if current signer can call createDrop
  if (signer.address.toLowerCase() === registrarAdmin.toLowerCase()) {
    console.log("\n✅ Current signer IS the registrarAdmin - can create drops");
  } else {
    console.log("\n❌ Current signer is NOT the registrarAdmin - cannot create drops");
    console.log("   You need to use the wallet:", registrarAdmin);
  }
}

main().catch((error) => {
  console.error("[check] Error:", error);
  process.exitCode = 1;
});
