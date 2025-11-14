#!/usr/bin/env node
/* eslint-disable no-console */
const hre = require("hardhat");

async function main() {
  const contractAddress = "0x9c78A662eB4269924536ce701ADAaB5493970FC9";

  console.log("[verify] Contract Address:", contractAddress);
  console.log("[verify] Etherscan:", `https://sepolia.etherscan.io/address/${contractAddress}`);

  const contract = await hre.ethers.getContractAt("DomainVaultAuction", contractAddress);

  // Check registrarAdmin
  const registrarAdmin = await contract.registrarAdmin();
  console.log("\n=== Contract Configuration ===");
  console.log("Registrar Admin:", registrarAdmin);

  // Check gatewaySigner
  const gatewaySigner = await contract.gatewaySigner();
  console.log("Gateway Signer:", gatewaySigner);

  // Expected values
  const expectedAdmin = "0x53f82210204EE87a485E288E0644E195360F4EBc";
  const expectedGateway = "0x33347831500f1E73f102B23B7D6B3e33D6DbBb46";

  console.log("\n=== Verification ===");
  console.log("Registrar Admin Match:", registrarAdmin.toLowerCase() === expectedAdmin.toLowerCase() ? "✅" : "❌");
  console.log("Gateway Signer Match:", gatewaySigner.toLowerCase() === expectedGateway.toLowerCase() ? "✅" : "❌");

  if (gatewaySigner.toLowerCase() === expectedGateway.toLowerCase()) {
    console.log("\n✅ Gateway configuration is CORRECT!");
    console.log("   Using Zama's official gateway (same as JudgeScore V3/V4)");
  } else {
    console.log("\n❌ Gateway configuration is WRONG!");
    console.log("   Expected:", expectedGateway);
    console.log("   Got:", gatewaySigner);
  }
}

main().catch(console.error);
