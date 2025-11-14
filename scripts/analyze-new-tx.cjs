#!/usr/bin/env node
const hre = require("hardhat");

async function main() {
  const txHash = "0x99469c0c7e71f3b85220c06d8aad6841983b3da2d3192db6ab62553ef6b0df4d";

  console.log("[analyze] Transaction:", txHash);
  console.log("[analyze] Etherscan:", `https://sepolia.etherscan.io/tx/${txHash}`);

  const provider = hre.ethers.provider;

  // Get transaction
  const tx = await provider.getTransaction(txHash);
  if (!tx) {
    console.error("Transaction not found");
    return;
  }

  console.log("\n=== Transaction ===" );
  console.log("From:", tx.from);
  console.log("To:", tx.to);
  console.log("Value:", hre.ethers.formatEther(tx.value), "ETH");
  console.log("Gas Limit:", tx.gasLimit.toString());

  // Get receipt
  const receipt = await provider.getTransactionReceipt(txHash);
  console.log("\n=== Receipt ===");
  console.log("Status:", receipt.status === 1 ? "Success" : "Failed");
  console.log("Gas Used:", receipt.gasUsed.toString());
  console.log("Block:", receipt.blockNumber);

  // Try to decode input
  console.log("\n=== Decoding Input ===");
  try {
    const artifact = await hre.artifacts.readArtifact("DomainVaultAuction");
    const iface = new hre.ethers.Interface(artifact.abi);
    const decoded = iface.parseTransaction({ data: tx.data, value: tx.value });

    console.log("Function:", decoded.name);
    console.log("\nArguments:");
    decoded.fragment.inputs.forEach((input, index) => {
      const value = decoded.args[index];
      console.log(`\n${index + 1}. ${input.name} (${input.type}):`);

      if (input.type === 'bytes32') {
        console.log(`   ${value}`);
      } else if (input.type === 'address') {
        console.log(`   ${value}`);
      } else if (input.type === 'uint64') {
        const timestamp = Number(value);
        console.log(`   ${value} (${timestamp})`);
        console.log(`   Date: ${new Date(timestamp * 1000).toISOString()}`);
      } else if (input.type === 'bytes') {
        console.log(`   Length: ${value.length} bytes`);
        console.log(`   First 66 chars: ${value.slice(0, 66)}`);
      } else {
        console.log(`   ${value}`);
      }
    });
  } catch (error) {
    console.error("Could not decode:", error.message);
  }

  // Try to simulate and get revert reason
  console.log("\n=== Analyzing Failure ===");
  try {
    await provider.call({
      from: tx.from,
      to: tx.to,
      data: tx.data,
      value: tx.value,
      gasLimit: tx.gasLimit
    }, receipt.blockNumber - 1);

    console.log("Simulation succeeded (unexpected)");
  } catch (error) {
    console.log("Simulation failed (expected)");

    if (error.data) {
      console.log("\nError data:", error.data);

      // Try to decode custom error
      try {
        const artifact = await hre.artifacts.readArtifact("DomainVaultAuction");
        const iface = new hre.ethers.Interface(artifact.abi);

        const selector = error.data.slice(0, 10);
        console.log("Error selector:", selector);

        // List all contract errors
        console.log("\n=== Contract Custom Errors ===");
        const errors = artifact.abi.filter(item => item.type === 'error');

        for (const errorDef of errors) {
          const errorSelector = iface.getError(errorDef.name).selector;
          const match = errorSelector === selector ? "✅ MATCH!" : "";
          console.log(`${errorDef.name}: ${errorSelector} ${match}`);

          if (match) {
            console.log("\n🎯 This is the error that was thrown!");
            console.log("Error name:", errorDef.name);

            // Try to decode parameters if any
            try {
              const decoded = iface.parseError(error.data);
              if (decoded.args && decoded.args.length > 0) {
                console.log("Error arguments:", decoded.args);
              }
            } catch (e) {
              // No args or failed to decode
            }
          }
        }
      } catch (e) {
        console.error("Could not decode error:", e.message);
      }
    } else {
      console.log("\nError message:", error.message);
    }
  }
}

main().catch(console.error);
