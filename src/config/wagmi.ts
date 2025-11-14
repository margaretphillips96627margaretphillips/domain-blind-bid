/**
 * Wagmi & RainbowKit Configuration
 *
 * Configures Web3 wallet connection with RainbowKit for DomainVault DApp
 * - Sepolia testnet support
 * - Coinbase Wallet connector explicitly disabled
 * - MetaMask, WalletConnect, and other wallets supported
 */

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';
import { metaMaskWallet, walletConnectWallet, rainbowWallet, trustWallet } from '@rainbow-me/rainbowkit/wallets';

/**
 * Wagmi configuration for DomainVault DApp
 * Coinbase Wallet is excluded from the connectors list
 */
export const wagmiConfig = getDefaultConfig({
  appName: 'DomainVault - FHE Domain Auctions',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [sepolia],
  ssr: false,

  // Explicitly configure wallets without Coinbase
  wallets: [
    {
      groupName: 'Popular',
      wallets: [
        metaMaskWallet,
        walletConnectWallet,
        rainbowWallet,
        trustWallet,
      ],
    },
  ],
});

/**
 * Supported chains
 */
export const supportedChains = [sepolia];

/**
 * Default chain
 */
export const defaultChain = sepolia;

/**
 * Chain configuration
 */
export const chainConfig = {
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia',
    network: 'sepolia',
    nativeCurrency: {
      decimals: 18,
      name: 'Sepolia ETH',
      symbol: 'ETH',
    },
    rpcUrls: {
      public: { http: ['https://ethereum-sepolia-rpc.publicnode.com'] },
      default: { http: ['https://ethereum-sepolia-rpc.publicnode.com'] },
    },
    blockExplorers: {
      etherscan: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
      default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
    },
    testnet: true,
  },
};

/**
 * Contract addresses (to be updated after deployment)
 */
export const contractAddresses = {
  domainVaultAuction: import.meta.env.VITE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
} as const;

/**
 * Get contract address for current chain
 *
 * @param chainId - Chain ID
 * @returns Contract address or undefined
 */
export function getContractAddress(chainId: number): string | undefined {
  if (chainId === sepolia.id) {
    return contractAddresses.domainVaultAuction;
  }
  return undefined;
}

/**
 * Check if chain is supported
 *
 * @param chainId - Chain ID to check
 * @returns True if chain is supported
 */
export function isSupportedChain(chainId: number): boolean {
  return supportedChains.some(chain => chain.id === chainId);
}
