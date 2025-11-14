/**
 * Verify DomainVaultAuction Contract on Etherscan
 *
 * Usage:
 * npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <GATEWAY_SIGNER_ADDRESS>
 *
 * Or run this script:
 * node scripts/verify-contract.js <CONTRACT_ADDRESS>
 */

const hre = require("hardhat");
require("dotenv").config();

async function main() {
  // Get contract address from command line or environment
  const contractAddress = process.argv[2] || process.env.VITE_CONTRACT_ADDRESS;
  const gatewaySigner = process.env.DOMAINVAULT_GATEWAY_SIGNER;

  if (!contractAddress) {
    console.error("❌ Error: Contract address is required");
    console.log("\nUsage:");
    console.log("  node scripts/verify-contract.js <CONTRACT_ADDRESS>");
    console.log("\nOr set VITE_CONTRACT_ADDRESS in .env file");
    process.exit(1);
  }

  if (!gatewaySigner) {
    console.error("❌ Error: Gateway signer address is required");
    console.log("\nSet DOMAINVAULT_GATEWAY_SIGNER in .env file");
    process.exit(1);
  }

  console.log("\n🔍 Verifying contract on Etherscan...");
  console.log("━".repeat(50));
  console.log(`📝 Contract Address: ${contractAddress}`);
  console.log(`🔑 Gateway Signer:   ${gatewaySigner}`);
  console.log(`🌐 Network:          Sepolia`);
  console.log("━".repeat(50));

  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [gatewaySigner],
      contract: "contracts/DomainVaultAuction.sol:DomainVaultAuction"
    });

    console.log("\n✅ Contract verified successfully!");
    console.log(`🔗 View on Etherscan: https://sepolia.etherscan.io/address/${contractAddress}#code`);
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("\n✅ Contract is already verified!");
      console.log(`🔗 View on Etherscan: https://sepolia.etherscan.io/address/${contractAddress}#code`);
    } else {
      console.error("\n❌ Verification failed:", error.message);
      process.exit(1);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
