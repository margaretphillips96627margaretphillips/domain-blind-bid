#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

/**
 * Deploys DomainVaultAuction to the configured Sepolia network.
 * Saves the deployment info alongside an ABI copy for the frontend bundle.
 */
async function main() {
  console.log("[deploy] Using network:", hre.network.name);

  const [deployer] = await hre.ethers.getSigners();
  console.log("[deploy] Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("[deploy] Account balance:", hre.ethers.formatEther(balance), "ETH");

  const factory = await hre.ethers.getContractFactory("DomainVaultAuction");
  console.log("[deploy] Deploying contract...");

  // Contract constructor takes no parameters
  const contract = await factory.deploy();
  console.log("[deploy] Waiting for deployment...");

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`[deploy] DomainVaultAuction deployed at ${address}`);

  const artifact = await hre.artifacts.readArtifact("DomainVaultAuction");

  const deploymentTx = contract.deploymentTransaction();
  if (deploymentTx) {
    console.log("[deploy] Deployment transaction hash:", deploymentTx.hash);
    console.log("[deploy] Deployment transaction Etherscan:", `https://sepolia.etherscan.io/tx/${deploymentTx.hash}`);
  }

  const receipt = deploymentTx ? await deploymentTx.wait() : null;

  if (receipt) {
    console.log("[deploy] Deployment confirmed in block:", receipt.blockNumber);
    console.log("[deploy] Gas used:", receipt.gasUsed.toString());
    console.log("[deploy] Status:", receipt.status === 1 ? "Success" : "Failed");
  }

  const deploymentMeta = {
    network: hre.network.name,
    address,
    block: receipt ? receipt.blockNumber : null,
    abi: artifact.abi,
    deployedAt: new Date().toISOString(),
  };

  const deploymentDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(deploymentDir, { recursive: true });
  const deploymentFile = path.join(deploymentDir, `${hre.network.name}-DomainVaultAuction.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentMeta, null, 2));
  console.log("[deploy] Deployment metadata saved to", deploymentFile);

  const abiDir = path.join(__dirname, "..", "src", "abi");
  fs.mkdirSync(abiDir, { recursive: true });
  const abiFile = path.join(abiDir, "DomainVaultAuction.json");
  fs.writeFileSync(abiFile, JSON.stringify({ abi: artifact.abi }, null, 2));
  console.log("[deploy] ABI exported for frontend consumption at", abiFile);
}

main().catch((error) => {
  console.error("[deploy] Deployment failed:", error);
  process.exitCode = 1;
});
