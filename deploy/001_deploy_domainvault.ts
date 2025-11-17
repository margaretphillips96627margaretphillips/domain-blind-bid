import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

/**
 * Deploys DomainVaultAuction contract using hardhat-deploy
 *
 * This deployment script:
 * 1. Deploys DomainVaultAuction_v2 with ZamaEthereumConfig
 * 2. Saves deployment info to deployments/ directory
 * 3. Supports both local and Sepolia networks
 *
 * Usage:
 *   npx hardhat deploy --network localhost
 *   npx hardhat deploy --network sepolia
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("\n📦 Deploying DomainVaultAuction...");
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer);

  // Deploy the contract
  const deployment = await deploy("DomainVaultAuction", {
    contract: "contracts/DomainVaultAuction_v2.sol:DomainVaultAuction", // Full contract path
    from: deployer,
    args: [], // No constructor arguments needed with ZamaEthereumConfig
    log: true,
    waitConfirmations: hre.network.name === "sepolia" ? 5 : 1,
  });

  console.log("\n✅ DomainVaultAuction deployed:");
  console.log("   Address:", deployment.address);
  console.log("   Transaction:", deployment.transactionHash);
  console.log("   Block:", deployment.receipt?.blockNumber);
  console.log("   Gas used:", deployment.receipt?.gasUsed?.toString());

  // Verify on Etherscan if on Sepolia
  if (hre.network.name === "sepolia" && process.env.ETHERSCAN_API_KEY) {
    console.log("\n🔍 Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: deployment.address,
        constructorArguments: [],
      });
      console.log("✅ Contract verified on Etherscan");
    } catch (error) {
      if (error instanceof Error && error.message.includes("Already Verified")) {
        console.log("✅ Contract already verified");
      } else {
        console.error("❌ Verification failed:", error);
      }
    }
  }

  // Save ABI for frontend
  const artifact = await hre.artifacts.readArtifact("contracts/DomainVaultAuction_v2.sol:DomainVaultAuction");
  const fs = require("fs");
  const path = require("path");

  const abiDir = path.join(__dirname, "..", "src", "abi");
  fs.mkdirSync(abiDir, { recursive: true });

  const abiFile = path.join(abiDir, "DomainVaultAuction.json");
  fs.writeFileSync(abiFile, JSON.stringify({ abi: artifact.abi }, null, 2));

  console.log("\n📝 ABI exported to:", abiFile);

  // Update .env with new contract address
  if (hre.network.name === "sepolia") {
    try {
      const envPath = path.join(__dirname, "..", ".env");
      let envContent = fs.readFileSync(envPath, "utf8");

      // Update or add VITE_CONTRACT_ADDRESS
      if (envContent.includes("VITE_CONTRACT_ADDRESS=")) {
        envContent = envContent.replace(
          /VITE_CONTRACT_ADDRESS=.*/,
          `VITE_CONTRACT_ADDRESS=${deployment.address}`
        );
      } else {
        envContent += `\nVITE_CONTRACT_ADDRESS=${deployment.address}\n`;
      }

      fs.writeFileSync(envPath, envContent);
      console.log("\n✅ Updated .env with contract address:");
      console.log(`   VITE_CONTRACT_ADDRESS=${deployment.address}`);
    } catch (error) {
      console.log("\n⚠️  Please manually update .env with:");
      console.log(`VITE_CONTRACT_ADDRESS=${deployment.address}`);
    }
  }

  return true;
};

export default func;
func.id = "deploy_domainvault_v2"; // Unique ID to prevent re-execution
func.tags = ["DomainVaultAuction", "v2", "main"];
