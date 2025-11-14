#!/usr/bin/env node
/* eslint-disable no-console */
const hre = require("hardhat");

/**
 * Debug a failed transaction
 */
async function main() {
  // Get txHash from environment or command line
  const txHash = process.env.TX_HASH || "0x8192f6a3ef38dffe5dca98e4c33955ca9cc41c52873e0e03d6c8624d18b4fa83";

  console.log("[debug-tx] Analyzing transaction:", txHash);

  const provider = hre.ethers.provider;

  // Get transaction
  const tx = await provider.getTransaction(txHash);
  if (!tx) {
    console.error("❌ Transaction not found");
    return;
  }

  console.log("\n=== Transaction Details ===");
  console.log("From:", tx.from);
  console.log("To:", tx.to);
  console.log("Value:", hre.ethers.formatEther(tx.value), "ETH");
  console.log("Gas Limit:", tx.gasLimit.toString());
  console.log("Gas Price:", hre.ethers.formatUnits(tx.gasPrice || 0n, "gwei"), "gwei");

  // Get receipt
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) {
    console.error("❌ Receipt not found");
    return;
  }

  console.log("\n=== Receipt Details ===");
  console.log("Status:", receipt.status === 1 ? "✅ Success" : "❌ Failed");
  console.log("Block:", receipt.blockNumber);
  console.log("Gas Used:", receipt.gasUsed.toString());
  console.log("Effective Gas Price:", hre.ethers.formatUnits(receipt.gasPrice || 0n, "gwei"), "gwei");

  if (receipt.status === 0) {
    console.log("\n=== Debugging Revert Reason ===");

    try {
      // Try to replay the transaction to get the revert reason
      await provider.call(tx, tx.blockNumber - 1);
    } catch (error) {
      console.log("Revert Reason:", error.message);

      // Try to decode the error
      if (error.data) {
        console.log("Error Data:", error.data);

        // Try to decode custom errors
        const contractAddress = "0xa4Ccd9166E5A3373FA0E0Dc2145a90c37066abAA";
        const contract = await hre.ethers.getContractAt("DomainVaultAuction", contractAddress);

        try {
          const iface = contract.interface;
          const decodedError = iface.parseError(error.data);
          console.log("\n=== Decoded Custom Error ===");
          console.log("Error Name:", decodedError.name);
          console.log("Error Args:", decodedError.args);
        } catch (decodeError) {
          console.log("Could not decode error as custom error");
        }
      }
    }
  }

  // Decode transaction input
  console.log("\n=== Transaction Input ===");
  try {
    const contractAddress = "0xa4Ccd9166E5A3373FA0E0Dc2145a90c37066abAA";
    const contract = await hre.ethers.getContractAt("DomainVaultAuction", contractAddress);
    const iface = contract.interface;
    const decodedInput = iface.parseTransaction({ data: tx.data });

    console.log("Function:", decodedInput.name);
    console.log("Arguments:");
    decodedInput.args.forEach((arg, index) => {
      const param = decodedInput.fragment.inputs[index];
      console.log(`  ${param.name} (${param.type}):`, arg.toString());
    });
  } catch (error) {
    console.log("Could not decode input:", error.message);
  }
}

main().catch((error) => {
  console.error("[debug-tx] Error:", error);
  process.exitCode = 1;
});
