/**
 * DomainVault Contract Interaction Hooks
 *
 * React hooks for type-safe interaction with the DomainVaultAuction smart contract.
 * Integrates Wagmi wallet hooks with FHE encryption for secure bid submission.
 *
 * Available Hooks:
 *
 * Auction Lifecycle (Registrar/Admin):
 * - useCreateAuction: Create new auction drops with encrypted reserve price
 * - useUpdateDropSchedule: Extend auction bidding close time
 * - useCancelDrop: Cancel active auctions
 * - useRequestReveal: Request gateway to decrypt bids after auction ends
 * - useReleaseEscrow: Release winner's escrow to registrar
 *
 * Bidding (Participants):
 * - useSubmitBid: Submit new encrypted bids with escrow and salt commitment
 * - useEscalateBid: Update existing bids with new amounts and optional escrow
 * - useReclaimEscrow: Reclaim escrow deposits for non-winners
 *
 * Data Queries:
 * - useDropInfo: Fetch auction drop information and settlement status
 * - useCreateDrop: Low-level drop creation with full parameter control
 *
 * Features:
 * - Automatic FHE SDK initialization on first use
 * - Salt commitment generation for bid uniqueness
 * - Transaction confirmation waiting and status tracking
 * - User-friendly toast notifications for all states
 * - Comprehensive error handling with descriptive messages
 * - Loading states for encryption and blockchain submission
 *
 * @module useDomainVault
 */

import { useState, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { getContract, parseEther, type Hash } from 'viem';
import { useFheInstance } from '@/providers/FheProvider';
import { encryptUint64, generateRandomSalt, generateSaltCommitment } from '@/utils/encryption';
import { getContractAddress } from '@/config/wagmi';
import { toast } from 'sonner';

/**
 * DomainVault ABI - Updated to match actual contract (DomainVaultAuction.sol)
 * Includes all essential functions for auction lifecycle management
 */
const DOMAIN_VAULT_ABI = [
  // Admin functions
  {
    name: 'createDrop',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dropId', type: 'bytes32' },
      { name: 'registrar', type: 'address' },
      { name: 'allowlistOpens', type: 'uint64' },
      { name: 'biddingOpens', type: 'uint64' },
      { name: 'biddingCloses', type: 'uint64' },
      { name: 'reserve', type: 'bytes' },
      { name: 'reserveProof', type: 'bytes' }
    ],
    outputs: []
  },
  {
    name: 'updateDropSchedule',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dropId', type: 'bytes32' },
      { name: 'newBiddingCloses', type: 'uint64' }
    ],
    outputs: []
  },
  {
    name: 'cancelDrop',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dropId', type: 'bytes32' }
    ],
    outputs: []
  },
  // Bidding functions
  {
    name: 'submitBid',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'dropId', type: 'bytes32' },
      { name: 'encryptedBid', type: 'bytes' },
      { name: 'bidProof', type: 'bytes' },
      { name: 'saltCommitment', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'escalateBid',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'dropId', type: 'bytes32' },
      { name: 'upgradedBid', type: 'bytes' },
      { name: 'bidProof', type: 'bytes' },
      { name: 'newSaltCommitment', type: 'bytes32' }
    ],
    outputs: []
  },
  // Reveal functions
  {
    name: 'requestReveal',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dropId', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'recordReveal',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dropId', type: 'bytes32' },
      { name: 'winner', type: 'address' },
      { name: 'winningBid', type: 'bytes' },
      { name: 'proof', type: 'bytes' }
    ],
    outputs: []
  },
  // Escrow functions
  {
    name: 'releaseEscrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dropId', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'reclaimEscrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dropId', type: 'bytes32' }
    ],
    outputs: []
  },
  // View functions
  {
    name: 'getDrop',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'dropId', type: 'bytes32' }
    ],
    outputs: [
      { name: 'config', type: 'tuple' },
      { name: 'settlement', type: 'tuple' }
    ]
  },
  {
    name: 'getEnvelope',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'dropId', type: 'bytes32' },
      { name: 'bidder', type: 'address' }
    ],
    outputs: [
      { name: 'envelope', type: 'tuple' }
    ]
  },
  {
    name: 'getHighestBid',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'dropId', type: 'bytes32' }
    ],
    outputs: [
      { name: '', type: 'uint256' }
    ]
  },
  {
    name: 'getLeadingBidder',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'dropId', type: 'bytes32' }
    ],
    outputs: [
      { name: '', type: 'address' }
    ]
  }
] as const;

/**
 * Hook for submitting encrypted bids
 */
export function useSubmitBid() {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { fhe, initialize } = useFheInstance();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);

  const submitBid = useCallback(async (
    dropId: string,
    bidAmountEth: string,
    escrowAmountEth: string
  ): Promise<Hash> => {
    if (!address || !chainId || !walletClient || !publicClient) {
      throw new Error('Wallet not connected');
    }

    const contractAddress = getContractAddress(chainId);
    if (!contractAddress) {
      throw new Error('Contract not deployed on this network');
    }

    try {
      // Step 1: Initialize FHE if needed
      if (!fhe) {
        console.log('[SubmitBid] Initializing FHE SDK...');
        toast.info('Initializing encryption...');
        await initialize();
      }

      // Step 2: Encrypt bid amount
      setIsEncrypting(true);
      console.log('[SubmitBid] Encrypting bid amount:', bidAmountEth, 'ETH');
      toast.info('Encrypting bid amount...');

      const bidAmountWei = parseEther(bidAmountEth);
      const { handle, proof } = await encryptUint64(
        bidAmountWei,
        contractAddress,
        address
      );

      // Step 3: Generate salt commitment
      const salt = generateRandomSalt();
      const saltCommitment = generateSaltCommitment(salt);
      console.log('[SubmitBid] Generated salt commitment');

      setIsEncrypting(false);

      // Step 4: Submit transaction
      setIsSubmitting(true);
      console.log('[SubmitBid] Submitting transaction...');
      toast.info('Submitting encrypted bid...');

      const escrowWei = parseEther(escrowAmountEth);

      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: DOMAIN_VAULT_ABI,
        functionName: 'submitBid',
        args: [dropId as `0x${string}`, handle as `0x${string}`, proof as `0x${string}`, saltCommitment as `0x${string}`],
        value: escrowWei,
        gas: BigInt(10000000), // Set gas limit for FHE operations
      });

      console.log('[SubmitBid] Transaction hash:', hash);
      toast.info('Waiting for confirmation...');

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      console.log('[SubmitBid] Transaction confirmed:', receipt.status);

      if (receipt.status === 'success') {
        toast.success('Bid submitted successfully!');
      } else {
        throw new Error('Transaction failed');
      }

      return hash;
    } catch (error) {
      console.error('[SubmitBid] Error:', error);
      const message = error instanceof Error ? error.message : 'Failed to submit bid';
      toast.error(message);
      throw error;
    } finally {
      setIsEncrypting(false);
      setIsSubmitting(false);
    }
  }, [address, chainId, walletClient, publicClient, fhe, initialize]);

  return {
    submitBid,
    isSubmitting,
    isEncrypting,
    isProcessing: isSubmitting || isEncrypting,
  };
}

/**
 * Hook for escalating existing bids
 */
export function useEscalateBid() {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { fhe, initialize } = useFheInstance();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);

  const escalateBid = useCallback(async (
    dropId: string,
    newBidAmountEth: string,
    additionalEscrowEth: string = '0'
  ): Promise<Hash> => {
    if (!address || !chainId || !walletClient || !publicClient) {
      throw new Error('Wallet not connected');
    }

    const contractAddress = getContractAddress(chainId);
    if (!contractAddress) {
      throw new Error('Contract not deployed on this network');
    }

    try {
      // Initialize FHE if needed
      if (!fhe) {
        console.log('[EscalateBid] Initializing FHE SDK...');
        toast.info('Initializing encryption...');
        await initialize();
      }

      // Encrypt new bid amount
      setIsEncrypting(true);
      console.log('[EscalateBid] Encrypting new bid amount:', newBidAmountEth, 'ETH');
      toast.info('Encrypting updated bid...');

      const bidAmountWei = parseEther(newBidAmountEth);
      const { handle, proof } = await encryptUint64(
        bidAmountWei,
        contractAddress,
        address
      );

      setIsEncrypting(false);

      // Submit transaction
      setIsSubmitting(true);
      console.log('[EscalateBid] Submitting transaction...');
      toast.info('Updating bid...');

      const additionalEscrowWei = parseEther(additionalEscrowEth);

      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: DOMAIN_VAULT_ABI,
        functionName: 'escalateBid',
        args: [
          dropId as `0x${string}`,
          handle as `0x${string}`,
          proof as `0x${string}`,
          '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}` // Keep existing salt
        ],
        value: additionalEscrowWei,
        gas: BigInt(10000000), // Set gas limit for FHE operations
      });

      console.log('[EscalateBid] Transaction hash:', hash);
      toast.info('Waiting for confirmation...');

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      console.log('[EscalateBid] Transaction confirmed:', receipt.status);

      if (receipt.status === 'success') {
        toast.success('Bid updated successfully!');
      } else {
        throw new Error('Transaction failed');
      }

      return hash;
    } catch (error) {
      console.error('[EscalateBid] Error:', error);
      const message = error instanceof Error ? error.message : 'Failed to escalate bid';
      toast.error(message);
      throw error;
    } finally {
      setIsEncrypting(false);
      setIsSubmitting(false);
    }
  }, [address, chainId, walletClient, publicClient, fhe, initialize]);

  return {
    escalateBid,
    isSubmitting,
    isEncrypting,
    isProcessing: isSubmitting || isEncrypting,
  };
}

/**
 * Hook for reclaiming escrow
 */
export function useReclaimEscrow() {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isReclaiming, setIsReclaiming] = useState(false);

  const reclaimEscrow = useCallback(async (dropId: string): Promise<Hash> => {
    if (!address || !chainId || !walletClient || !publicClient) {
      throw new Error('Wallet not connected');
    }

    const contractAddress = getContractAddress(chainId);
    if (!contractAddress) {
      throw new Error('Contract not deployed on this network');
    }

    try {
      setIsReclaiming(true);
      console.log('[ReclaimEscrow] Reclaiming escrow for drop:', dropId);
      toast.info('Reclaiming escrow...');

      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: DOMAIN_VAULT_ABI,
        functionName: 'reclaimEscrow',
        args: [dropId as `0x${string}`],
      });

      console.log('[ReclaimEscrow] Transaction hash:', hash);
      toast.info('Waiting for confirmation...');

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      console.log('[ReclaimEscrow] Transaction confirmed:', receipt.status);

      if (receipt.status === 'success') {
        toast.success('Escrow reclaimed successfully!');
      } else {
        throw new Error('Transaction failed');
      }

      return hash;
    } catch (error) {
      console.error('[ReclaimEscrow] Error:', error);
      const message = error instanceof Error ? error.message : 'Failed to reclaim escrow';
      toast.error(message);
      throw error;
    } finally {
      setIsReclaiming(false);
    }
  }, [address, chainId, walletClient, publicClient]);

  return {
    reclaimEscrow,
    isReclaiming,
  };
}

interface CreateDropParams {
  dropId: `0x${string}`;
  allowlistOpens: bigint;
  biddingOpens: bigint;
  biddingCloses: bigint;
  reserveWei: bigint;
}

/**
 * Hook for creating new drops (auctions)
 */
export function useCreateDrop() {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { fhe, initialize } = useFheInstance();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);

  const createDrop = useCallback(async ({
    dropId,
    allowlistOpens,
    biddingOpens,
    biddingCloses,
    reserveWei,
  }: CreateDropParams): Promise<Hash> => {
    if (!address || !chainId || !walletClient || !publicClient) {
      throw new Error('Wallet not connected');
    }

    const contractAddress = getContractAddress(chainId);
    if (!contractAddress) {
      throw new Error('Contract not deployed on this network');
    }

    try {
      if (!fhe) {
        console.log('[CreateDrop] Initializing FHE SDK...');
        toast.info('Initializing encryption...');
        await initialize();
      }

      setIsEncrypting(true);
      console.log('[CreateDrop] Encrypting reserve amount (wei):', reserveWei.toString());
      toast.info('Encrypting reserve price...');

      const { handle, proof } = await encryptUint64(
        reserveWei,
        contractAddress,
        address
      );

      setIsEncrypting(false);

      setIsSubmitting(true);
      console.log('[CreateDrop] Submitting createDrop transaction');
      toast.info('Submitting auction creation...');

      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: DOMAIN_VAULT_ABI,
        functionName: 'createDrop',
        args: [
          dropId,
          address as `0x${string}`,
          allowlistOpens,
          biddingOpens,
          biddingCloses,
          handle as `0x${string}`,
          proof as `0x${string}`,
        ],
      });

      console.log('[CreateDrop] Transaction hash:', hash);
      toast.info('Waiting for confirmation...');

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('[CreateDrop] Transaction confirmed:', receipt.status);

      if (receipt.status === 'success') {
        toast.success('Auction created successfully!');
      } else {
        throw new Error('Transaction failed');
      }

      return hash;
    } catch (error) {
      console.error('[CreateDrop] Error:', error);
      const message = error instanceof Error ? error.message : 'Failed to create auction';
      toast.error(message);
      throw error;
    } finally {
      setIsEncrypting(false);
      setIsSubmitting(false);
    }
  }, [address, chainId, walletClient, publicClient, fhe, initialize]);

  return {
    createDrop,
    isSubmitting,
    isEncrypting,
    isProcessing: isSubmitting || isEncrypting,
  };
}

/**
 * Hook for requesting reveal (registrar only)
 */
export function useRequestReveal() {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isRequesting, setIsRequesting] = useState(false);

  const requestReveal = useCallback(async (dropId: string): Promise<Hash> => {
    if (!address || !chainId || !walletClient || !publicClient) {
      throw new Error('Wallet not connected');
    }

    const contractAddress = getContractAddress(chainId);
    if (!contractAddress) {
      throw new Error('Contract not deployed on this network');
    }

    try {
      setIsRequesting(true);
      console.log('[RequestReveal] Requesting reveal for drop:', dropId);
      toast.info('Requesting reveal from gateway...');

      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: DOMAIN_VAULT_ABI,
        functionName: 'requestReveal',
        args: [dropId as `0x${string}`],
      });

      console.log('[RequestReveal] Transaction hash:', hash);
      toast.info('Waiting for confirmation...');

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      console.log('[RequestReveal] Transaction confirmed:', receipt.status);

      if (receipt.status === 'success') {
        toast.success('Reveal requested! Waiting for gateway to process...');
      } else {
        throw new Error('Transaction failed');
      }

      return hash;
    } catch (error) {
      console.error('[RequestReveal] Error:', error);
      const message = error instanceof Error ? error.message : 'Failed to request reveal';
      toast.error(message);
      throw error;
    } finally {
      setIsRequesting(false);
    }
  }, [address, chainId, walletClient, publicClient]);

  return {
    requestReveal,
    isRequesting,
  };
}

/**
 * Hook for releasing escrow to registrar (registrar only)
 */
export function useReleaseEscrow() {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isReleasing, setIsReleasing] = useState(false);

  const releaseEscrow = useCallback(async (dropId: string): Promise<Hash> => {
    if (!address || !chainId || !walletClient || !publicClient) {
      throw new Error('Wallet not connected');
    }

    const contractAddress = getContractAddress(chainId);
    if (!contractAddress) {
      throw new Error('Contract not deployed on this network');
    }

    try {
      setIsReleasing(true);
      console.log('[ReleaseEscrow] Releasing escrow for drop:', dropId);
      toast.info('Releasing winner escrow...');

      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: DOMAIN_VAULT_ABI,
        functionName: 'releaseEscrow',
        args: [dropId as `0x${string}`],
      });

      console.log('[ReleaseEscrow] Transaction hash:', hash);
      toast.info('Waiting for confirmation...');

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      console.log('[ReleaseEscrow] Transaction confirmed:', receipt.status);

      if (receipt.status === 'success') {
        toast.success('Escrow released to registrar!');
      } else {
        throw new Error('Transaction failed');
      }

      return hash;
    } catch (error) {
      console.error('[ReleaseEscrow] Error:', error);
      const message = error instanceof Error ? error.message : 'Failed to release escrow';
      toast.error(message);
      throw error;
    } finally {
      setIsReleasing(false);
    }
  }, [address, chainId, walletClient, publicClient]);

  return {
    releaseEscrow,
    isReleasing,
  };
}

/**
 * Hook for updating drop schedule (registrar only)
 */
export function useUpdateDropSchedule() {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isUpdating, setIsUpdating] = useState(false);

  const updateSchedule = useCallback(async (
    dropId: string,
    newBiddingCloses: number
  ): Promise<Hash> => {
    if (!address || !chainId || !walletClient || !publicClient) {
      throw new Error('Wallet not connected');
    }

    const contractAddress = getContractAddress(chainId);
    if (!contractAddress) {
      throw new Error('Contract not deployed on this network');
    }

    try {
      setIsUpdating(true);
      console.log('[UpdateSchedule] Updating schedule for drop:', dropId);
      toast.info('Updating auction schedule...');

      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: DOMAIN_VAULT_ABI,
        functionName: 'updateDropSchedule',
        args: [dropId as `0x${string}`, BigInt(newBiddingCloses)],
      });

      console.log('[UpdateSchedule] Transaction hash:', hash);
      toast.info('Waiting for confirmation...');

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      console.log('[UpdateSchedule] Transaction confirmed:', receipt.status);

      if (receipt.status === 'success') {
        toast.success('Auction schedule updated!');
      } else {
        throw new Error('Transaction failed');
      }

      return hash;
    } catch (error) {
      console.error('[UpdateSchedule] Error:', error);
      const message = error instanceof Error ? error.message : 'Failed to update schedule';
      toast.error(message);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [address, chainId, walletClient, publicClient]);

  return {
    updateSchedule,
    isUpdating,
  };
}

/**
 * Hook for canceling drops (registrar only)
 */
export function useCancelDrop() {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isCanceling, setIsCanceling] = useState(false);

  const cancelDrop = useCallback(async (dropId: string): Promise<Hash> => {
    if (!address || !chainId || !walletClient || !publicClient) {
      throw new Error('Wallet not connected');
    }

    const contractAddress = getContractAddress(chainId);
    if (!contractAddress) {
      throw new Error('Contract not deployed on this network');
    }

    try {
      setIsCanceling(true);
      console.log('[CancelDrop] Canceling drop:', dropId);
      toast.info('Canceling auction...');

      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: DOMAIN_VAULT_ABI,
        functionName: 'cancelDrop',
        args: [dropId as `0x${string}`],
      });

      console.log('[CancelDrop] Transaction hash:', hash);
      toast.info('Waiting for confirmation...');

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      console.log('[CancelDrop] Transaction confirmed:', receipt.status);

      if (receipt.status === 'success') {
        toast.success('Auction canceled!');
      } else {
        throw new Error('Transaction failed');
      }

      return hash;
    } catch (error) {
      console.error('[CancelDrop] Error:', error);
      const message = error instanceof Error ? error.message : 'Failed to cancel drop';
      toast.error(message);
      throw error;
    } finally {
      setIsCanceling(false);
    }
  }, [address, chainId, walletClient, publicClient]);

  return {
    cancelDrop,
    isCanceling,
  };
}

/**
 * Hook for reading drop information
 */
export function useDropInfo(dropId: string | undefined) {
  const { chainId } = useAccount();
  const publicClient = usePublicClient();

  const [dropInfo, setDropInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDropInfo = useCallback(async () => {
    if (!dropId || !chainId || !publicClient) {
      return;
    }

    const contractAddress = getContractAddress(chainId);
    if (!contractAddress) {
      setError('Contract not deployed on this network');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const contract = getContract({
        address: contractAddress as `0x${string}`,
        abi: DOMAIN_VAULT_ABI,
        client: publicClient,
      });

      const data = await contract.read.getDrop([dropId as `0x${string}`]);
      setDropInfo(data);
    } catch (err) {
      console.error('[DropInfo] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch drop info');
    } finally {
      setIsLoading(false);
    }
  }, [dropId, chainId, publicClient]);

  return {
    dropInfo,
    isLoading,
    error,
    refetch: fetchDropInfo,
  };
}

/**
 * Hook for creating new auction drops
 */
export function useCreateAuction() {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { fhe, initialize } = useFheInstance();

  const [isCreating, setIsCreating] = useState(false);
  const [isEncryptingReserve, setIsEncryptingReserve] = useState(false);

  const createAuction = useCallback(async (
    dropId: string,
    domainName: string,
    reservePriceEth: string,
    biddingOpens: number,
    biddingCloses: number
  ): Promise<Hash> => {
    if (!address || !chainId || !walletClient || !publicClient) {
      throw new Error('Wallet not connected');
    }

    const contractAddress = getContractAddress(chainId);
    if (!contractAddress) {
      throw new Error('Contract not deployed on this network');
    }

    try {
      // Step 1: Initialize FHE if needed
      if (!fhe) {
        console.log('[CreateAuction] Initializing FHE SDK...');
        toast.info('Initializing encryption...');
        await initialize();
      }

      // Step 2: Encrypt reserve price
      setIsEncryptingReserve(true);
      console.log('[CreateAuction] Encrypting reserve price:', reservePriceEth, 'ETH');
      toast.info('Encrypting reserve price...');

      const reserveWei = parseEther(reservePriceEth);
      console.log('[CreateAuction] Reserve price:', {
        eth: reservePriceEth,
        wei: reserveWei.toString(),
      });

      const { handle: reserveHandle, proof: reserveProof } = await encryptUint64(
        reserveWei,
        contractAddress,
        address
      );

      console.log('[CreateAuction] Encrypted reserve:', {
        handleLength: reserveHandle.length,
        proofLength: reserveProof.length,
        handle: reserveHandle,
        proof: reserveProof,
      });

      setIsEncryptingReserve(false);

      // Step 3: Submit transaction
      setIsCreating(true);
      console.log('[CreateAuction] Creating auction for:', domainName);
      toast.info('Creating auction...');

      const allowlistOpens = biddingOpens; // Same as bidding opens for now

      // Log all parameters before sending
      console.log('[CreateAuction] Contract call parameters:', {
        dropId,
        registrar: address,
        allowlistOpens,
        biddingOpens,
        biddingCloses,
        'biddingOpens < biddingCloses': biddingOpens < biddingCloses,
        'allowlistOpens <= biddingOpens': allowlistOpens <= biddingOpens,
        duration: biddingCloses - biddingOpens,
        reserveHandleLength: reserveHandle.length,
        reserveProofLength: reserveProof.length,
      });

      // Validate timestamps before sending
      if (allowlistOpens > biddingOpens) {
        throw new Error('allowlistOpens must be <= biddingOpens');
      }
      if (biddingOpens >= biddingCloses) {
        throw new Error(`biddingOpens (${biddingOpens}) must be < biddingCloses (${biddingCloses})`);
      }

      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: DOMAIN_VAULT_ABI,
        functionName: 'createDrop',
        args: [
          dropId as `0x${string}`,
          address as `0x${string}`, // registrar (seller)
          BigInt(allowlistOpens),
          BigInt(biddingOpens),
          BigInt(biddingCloses),
          reserveHandle as `0x${string}`,
          reserveProof as `0x${string}`
        ],
        gas: BigInt(10000000), // Set gas limit to 10M (below Sepolia cap of 16.7M)
      });

      console.log('[CreateAuction] Transaction hash:', hash);
      console.log(`[CreateAuction] View on Etherscan: https://sepolia.etherscan.io/tx/${hash}`);
      toast.info('Waiting for confirmation...');

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      console.log('[CreateAuction] Transaction receipt:', {
        status: receipt.status,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        transactionHash: receipt.transactionHash,
      });

      if (receipt.status === 'success') {
        toast.success(`Auction created for ${domainName}!`);
      } else {
        console.error('[CreateAuction] Transaction reverted. Receipt:', receipt);
        throw new Error(`Transaction failed. Check Sepolia Etherscan: https://sepolia.etherscan.io/tx/${hash}`);
      }

      return hash;
    } catch (error) {
      console.error('[CreateAuction] Error:', error);
      const message = error instanceof Error ? error.message : 'Failed to create auction';
      toast.error(message);
      throw error;
    } finally {
      setIsEncryptingReserve(false);
      setIsCreating(false);
    }
  }, [address, chainId, walletClient, publicClient, fhe, initialize]);

  return {
    createAuction,
    isCreating,
    isEncryptingReserve,
    isProcessing: isCreating || isEncryptingReserve,
  };
}
