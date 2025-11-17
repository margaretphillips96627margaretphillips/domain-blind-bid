#!/usr/bin/env node
/* eslint-disable no-console */
const hre = require("hardhat");

async function main() {
  const txHash = "0x8192f6a3ef38dffe5dca98e4c33955ca9cc41c52873e0e03d6c8624d18b4fa83";

  console.log("[analyze] Transaction:", txHash);
  console.log("[analyze] Etherscan:", `https://sepolia.etherscan.io/tx/${txHash}`);

  const provider = hre.ethers.provider;

  // Get transaction
  const tx = await provider.getTransaction(txHash);
  if (!tx) {
    console.error("Transaction not found");
    return;
  }

  console.log("\n=== Transaction ===");
  console.log("From:", tx.from);
  console.log("To:", tx.to);
  console.log("Data length:", tx.data ? tx.data.length : 0);

  // Get receipt
  const receipt = await provider.getTransactionReceipt(txHash);
  console.log("\n=== Receipt ===");
  console.log("Status:", receipt.status === 1 ? "Success" : "Failed");
  console.log("Gas Used:", receipt.gasUsed.toString());

  if (receipt.status === 0) {
    console.log("\n=== Analyzing Failure ===");

    try {
      // Try to simulate the transaction
      const code = await provider.call({
        from: tx.from,
        to: tx.to,
        data: tx.data,
        value: tx.value,
        gasLimit: tx.gasLimit
      }, receipt.blockNumber - 1);

      console.log("Simulation succeeded (unexpected):", code);
    } catch (error) {
      console.log("\nSimulation failed (expected)");

      // Parse error
      if (error.data) {
        console.log("Error data:", error.data);

        // Try to decode as custom error
        const contractAddress = "0xa4Ccd9166E5A3373FA0E0Dc2145a90c37066abAA";
        try {
          const artifact = await hre.artifacts.readArtifact("DomainVaultAuction");
          const iface = new hre.ethers.Interface(artifact.abi);

          // List all possible errors
          console.log("\n=== Contract Errors ===");
          const errors = Object.keys(iface.fragments).filter(key =>
            iface.fragments[key].type === 'error'
          );
          errors.forEach(err => {
            const fragment = iface.fragments[err];
            console.log(`  - ${fragment.name}`);
          });

          // Try to decode the error
          try {
            const decoded = iface.parseError(error.data);
            console.log("\n[Logs] Decoded Error:");
            console.log("  Name:", decoded.name);
            console.log("  Args:", decoded.args);
          } catch (decodeErr) {
            console.log("\n[Logs] Could not decode error data");

            // Try to match error selector
            const selector = error.data.slice(0, 10);
            console.log("Error selector:", selector);

            // Calculate selectors for each error
            console.log("\n=== Error Selectors ===");
            errors.forEach(err => {
              const fragment = iface.fragments[err];
              const errorSelector = hre.ethers.id(fragment.format()).slice(0, 10);
              const match = errorSelector === selector ? "MATCH" : "";
              console.log(`  ${fragment.name}: ${errorSelector} ${match}`);
            });
          }
        } catch (abiError) {
          console.error("Error loading ABI:", abiError.message);
        }
      } else {
        console.log("Error message:", error.message);
      }
    }
  }

  // Decode input
  console.log("\n=== Decoding Transaction Input ===");
  try {
    const artifact = await hre.artifacts.readArtifact("DomainVaultAuction");
    const iface = new hre.ethers.Interface(artifact.abi);
    const decoded = iface.parseTransaction({ data: tx.data, value: tx.value });

    console.log("Function:", decoded.name);
    console.log("Arguments:");
    decoded.fragment.inputs.forEach((input, index) => {
      const value = decoded.args[index];
      console.log(`  ${input.name} (${input.type}):`);
      if (input.type === 'bytes32') {
        console.log(`    ${value}`);
      } else if (input.type === 'uint64') {
        console.log(`    ${value} (${new Date(Number(value) * 1000).toISOString()})`);
      } else if (input.type === 'bytes') {
        console.log(`    Length: ${value.length} bytes`);
        console.log(`    ${value.slice(0, 66)}...`);
      } else {
        console.log(`    ${value}`);
      }
    });
  } catch (error) {
    console.error("Could not decode input:", error.message);
  }
}

main().catch(console.error);
