import { useState, useCallback, useEffect } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseEther, type Hex, createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { toast } from 'sonner';

import { initializeFHE, isFheReady } from '@/utils/fheInstance';
import { encryptUint64 } from '@/utils/encryption';
import { getContractAddress } from '@/config/wagmi';

/**
 * DomainVault Auction Hooks (fhEVM 0.9.x + Relayer 0.3.0-5)
 *
 *  - useAuctionIds / useAuctionInfo 读取拍卖列表与详情
 *  - useCreateAuction 管理员创建拍卖
 *  - usePlaceBid 提交加密出价
 *  - useFinalizeAuction 结束拍卖
 *  - useGrantView 授权查看密文结果
 *  - useEncryptedResult 获取最高价/赢家的密文
 */

const DOMAIN_VAULT_ABI = [
  {
    name: 'createAuction',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'auctionId', type: 'bytes32' },
      { name: 'domain', type: 'string' },
      { name: 'durationSeconds', type: 'uint64' },
      { name: 'startingBidWei', type: 'uint64' },
    ],
    outputs: [],
  },
  {
    name: 'placeBid',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'auctionId', type: 'bytes32' },
      { name: 'encryptedBid', type: 'bytes32' },
      { name: 'inputProof', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'finalizeAuction',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'auctionId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'grantView',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'auctionId', type: 'bytes32' },
      { name: 'viewer', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'getAuction',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'auctionId', type: 'bytes32' }],
    outputs: [
      {
        components: [
          { name: 'seller', type: 'address' },
          { name: 'domain', type: 'string' },
          { name: 'biddingOpens', type: 'uint64' },
          { name: 'biddingCloses', type: 'uint64' },
          { name: 'startingBidWei', type: 'uint64' },
          { name: 'bidCount', type: 'uint32' },
          { name: 'ended', type: 'bool' },
          { name: 'exists', type: 'bool' },
        ],
        type: 'tuple',
      },
    ],
  },
  {
    name: 'getAuctionIds',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bytes32[]' }],
  },
  {
    name: 'highestBid',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'auctionId', type: 'bytes32' }],
    outputs: [{ type: 'bytes' }],
  },
  {
    name: 'winner',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'auctionId', type: 'bytes32' }],
    outputs: [{ type: 'bytes' }],
  },
] as const;

type AuctionSummary = {
  auctionId: `0x${string}`;
  seller: `0x${string}`;
  domain: string;
  biddingOpens: number;
  biddingCloses: number;
  startingBidWei: bigint;
  bidCount: number;
  ended: boolean;
};

function ensureContract(chainId?: number) {
  if (!chainId) throw new Error('No chain ID');
  const address = getContractAddress(chainId);
  if (!address) throw new Error('DomainVault contract not deployed on this network');
  return address as `0x${string}`;
}

/**
 * 读取全部拍卖 ID
 */
export function useAuctionIds() {
  const { chainId } = useAccount();
  const publicClient = usePublicClient();

  const [ids, setIds] = useState<`0x${string}`[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chainId || !publicClient) return;

    let cancelled = false;

    const fetchIds = async () => {
      try {
        setIsLoading(true);
        const address = ensureContract(chainId);
        const result = await publicClient.readContract({
          address,
          abi: DOMAIN_VAULT_ABI,
          functionName: 'getAuctionIds',
        });
        if (!cancelled) {
          setIds(result as `0x${string}`[]);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[useAuctionIds] Error:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch auction IDs');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchIds();
    return () => {
      cancelled = true;
    };
  }, [chainId, publicClient]);

  return { ids, isLoading, error };
}

/**
 * 读取单个拍卖详情
 */
export function useAuctionInfo(auctionId?: `0x${string}`) {
  const { chainId } = useAccount();
  const publicClient = usePublicClient();

  const [auction, setAuction] = useState<AuctionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chainId || !publicClient || !auctionId) return;

    let cancelled = false;

    const fetchAuction = async () => {
      try {
        setIsLoading(true);
        const address = ensureContract(chainId);
        const data = await publicClient.readContract({
          address,
          abi: DOMAIN_VAULT_ABI,
          functionName: 'getAuction',
          args: [auctionId],
        });

        if (!cancelled) {
          const summary: AuctionSummary = {
            auctionId,
            seller: data[0] as `0x${string}`,
            domain: data[1] as string,
            biddingOpens: Number(data[2]),
            biddingCloses: Number(data[3]),
            startingBidWei: BigInt(data[4]),
            bidCount: Number(data[5]),
            ended: Boolean(data[6]),
          };
          setAuction(summary);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[useAuctionInfo] Error:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch auction');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchAuction();
    return () => {
      cancelled = true;
    };
  }, [chainId, publicClient, auctionId]);

  return { auction, isLoading, error };
}

/**
 * 管理员创建拍卖
 */
export function useCreateAuction() {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isPending, setIsPending] = useState(false);

  const createAuction = useCallback(
    async (
      auctionId: `0x${string}`,
      domain: string,
      durationSeconds: number,
      startingBidEth: string,
    ) => {
      if (!address || !chainId || !walletClient || !publicClient) {
        throw new Error('Wallet not connected');
      }

      const contractAddress = ensureContract(chainId);

      try {
        setIsPending(true);
        toast.info('Creating auction on-chain...');

        const startingBidWei = parseEther(startingBidEth);

        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: DOMAIN_VAULT_ABI,
          functionName: 'createAuction',
          args: [auctionId, domain, BigInt(durationSeconds), BigInt(startingBidWei)],
        });

        toast.info('Awaiting confirmation...');
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status === 'success') {
          toast.success('Auction created successfully');
        } else {
          throw new Error('Transaction reverted');
        }

        return hash;
      } catch (error) {
        console.error('[useCreateAuction] Error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to create auction');
        throw error;
      } finally {
        setIsPending(false);
      }
    },
    [address, chainId, walletClient, publicClient],
  );

  return { createAuction, isPending };
}

/**
 * 提交加密出价
 */
export function usePlaceBid() {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const placeBid = useCallback(
    async (auctionId: `0x${string}`, bidEth: string) => {
      if (!address || !chainId || !walletClient || !publicClient) {
        throw new Error('Wallet not connected');
      }

      const contractAddress = ensureContract(chainId);

      try {
        if (!isFheReady()) {
          await initializeFHE();
        }

        setIsSubmitting(true);
        toast.info('Encrypting bid...');

        const bidWei = parseEther(bidEth);
        const { handle, proof } = await encryptUint64(
          bidWei,
          contractAddress,
          address as `0x${string}`,
        );

        toast.info('Submitting sealed bid...');

        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: DOMAIN_VAULT_ABI,
          functionName: 'placeBid',
          args: [auctionId, handle as Hex, proof as Hex],
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === 'success') {
          toast.success('Bid submitted');
        } else {
          throw new Error('Bid transaction reverted');
        }

        return hash;
      } catch (error) {
        console.error('[usePlaceBid] Error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to place bid');
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [address, chainId, walletClient, publicClient],
  );

  return { placeBid, isSubmitting };
}

/**
 * 结束拍卖
 */
export function useFinalizeAuction() {
  const { chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isPending, setIsPending] = useState(false);

  const finalize = useCallback(
    async (auctionId: `0x${string}`) => {
      if (!chainId || !walletClient || !publicClient) {
        throw new Error('Wallet not connected');
      }

      const contractAddress = ensureContract(chainId);

      try {
        setIsPending(true);
        toast.info('Finalizing auction...');

        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: DOMAIN_VAULT_ABI,
          functionName: 'finalizeAuction',
          args: [auctionId],
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === 'success') {
          toast.success('Auction finalized');
        } else {
          throw new Error('Finalize transaction reverted');
        }

        return hash;
      } catch (error) {
        console.error('[useFinalizeAuction] Error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to finalize auction');
        throw error;
      } finally {
        setIsPending(false);
      }
    },
    [chainId, walletClient, publicClient],
  );

  return { finalize, isPending };
}

/**
 * 授权查看密文结果
 */
export function useGrantView() {
  const { chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isPending, setIsPending] = useState(false);

  const grantView = useCallback(
    async (auctionId: `0x${string}`, viewer: `0x${string}`) => {
      if (!chainId || !walletClient || !publicClient) {
        throw new Error('Wallet not connected');
      }

      const contractAddress = ensureContract(chainId);

      try {
        setIsPending(true);
        toast.info('Granting view access...');

        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: DOMAIN_VAULT_ABI,
          functionName: 'grantView',
          args: [auctionId, viewer],
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === 'success') {
          toast.success('View access granted');
        } else {
          throw new Error('grantView transaction reverted');
        }

        return hash;
      } catch (error) {
        console.error('[useGrantView] Error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to grant view');
        throw error;
      } finally {
        setIsPending(false);
      }
    },
    [chainId, walletClient, publicClient],
  );

  return { grantView, isPending };
}

/**
 * 读取最高价/赢家的密文
 */
export function useEncryptedResult(auctionId?: `0x${string}`, enabled: boolean = true) {
  const { chainId } = useAccount();
  const publicClient = usePublicClient();

  const [data, setData] = useState<{ highestBid?: Hex; winner?: Hex }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chainId || !publicClient || !auctionId || !enabled) {
      setData({});
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchResult = async () => {
      try {
        setIsLoading(true);
        const address = ensureContract(chainId);

        const highest = await publicClient.readContract({
          address,
          abi: DOMAIN_VAULT_ABI,
          functionName: 'highestBid',
          args: [auctionId],
        });

        const winner = await publicClient.readContract({
          address,
          abi: DOMAIN_VAULT_ABI,
          functionName: 'winner',
          args: [auctionId],
        });

        if (!cancelled) {
          setData({ highestBid: highest as Hex, winner: winner as Hex });
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[useEncryptedResult] Error:', err);
          setData({});
          setError(err instanceof Error ? err.message : 'Failed to fetch ciphertexts');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchResult();
    return () => {
      cancelled = true;
    };
  }, [chainId, publicClient, auctionId, enabled]);

  return { ...data, isLoading, error };
}

/**
 * 无钱包的公共读取客户端（SSR/回退）
 */
export function usePublicAuctionClient() {
  const [client] = useState(() =>
    createPublicClient({
      chain: sepolia,
      transport: http(),
    }),
  );

  return client;
}
