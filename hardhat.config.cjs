require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("@fhevm/hardhat-plugin");
require("@typechain/hardhat");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 800,
      },
      viaIR: true,
    },
  },
  defaultNetwork: "hardhat",
  fhevm: {
    network: "sepolia",
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.public.blastapi.io",
      accounts: [process.env.SEPOLIA_DEPLOYER_KEY, process.env.SEPOLIA_RELAYER_KEY].filter(Boolean),
      chainId: 11155111,
      timeout: 300000,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
};

module.exports = config;
