#!/usr/bin/env node
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Read deployment file
  const deploymentFile = path.join(__dirname, "..", "deployments", "sepolia-DomainVaultAuction.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));

  console.log("=== Deployment Info ===");
  console.log("Address:", deployment.address);
  console.log("Block:", deployment.block);
  console.log("Deployed At:", deployment.deployedAt);

  // Get provider
  const provider = hre.ethers.provider;

  // Check if address has code
  const code = await provider.getCode(deployment.address);
  console.log("\n=== On-Chain Status ===");
  console.log("Code length:", code.length, "characters");
  console.log("Has code:", code !== '0x');

  // Check balance
  const balance = await provider.getBalance(deployment.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH");

  // Try to get the deployment transaction from the block
  if (deployment.block) {
    console.log("\n=== Block Info ===");
    const block = await provider.getBlock(deployment.block);
    console.log("Block timestamp:", new Date(block.timestamp * 1000).toISOString());
    console.log("Transactions in block:", block.transactions.length);

    // Try to find our deployment transaction
    for (const txHash of block.transactions.slice(0, 5)) { // Check first 5 txs
      const tx = await provider.getTransaction(txHash);
      if (tx.to === null) { // Contract creation
        console.log("\nFound contract creation tx:", txHash);
        console.log("From:", tx.from);
        console.log("Etherscan:", `https://sepolia.etherscan.io/tx/${txHash}`);

        const receipt = await provider.getTransactionReceipt(txHash);
        console.log("Contract created:", receipt.contractAddress);
        console.log("Status:", receipt.status === 1 ? "Success" : "Failed");

        if (receipt.contractAddress.toLowerCase() === deployment.address.toLowerCase()) {
          console.log("✅ This is our deployment!");
        }
      }
    }
  }
}

main().catch(console.error);
