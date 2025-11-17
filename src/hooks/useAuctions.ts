import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { sepolia } from 'viem/chains';

import DomainVaultAuction from '@/abi/DomainVaultAuction.json';
import { contractAddresses } from '@/config/wagmi';

const DOMAIN_VAULT_ABI = DomainVaultAuction.abi as const;
const CONTRACT_ADDRESS = contractAddresses.domainVaultAuction as `0x${string}`;

export type AuctionStatus = 'upcoming' | 'active' | 'ended';

export interface AuctionData {
  auctionId: `0x${string}`;
  domain: string;
  seller: string;
  biddingOpens: bigint;
  biddingCloses: bigint;
  startingBidWei: bigint;
  bidCount: number;
  ended: boolean;
  status: AuctionStatus;
  isBiddingOpen: boolean;
  timeLeft: string;
}

function deriveStatus(biddingOpens: bigint, biddingCloses: bigint, ended: boolean): AuctionStatus {
  if (ended) return 'ended';
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (now < biddingOpens) return 'upcoming';
  if (now >= biddingCloses) return 'ended';
  return 'active';
}

function formatTimeLeft(target: bigint, status: AuctionStatus): string {
  if (status === 'ended') return 'Ended';
  const diff = Number(target) - Math.floor(Date.now() / 1000);
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function mapAuctionData(auctionId: `0x${string}`, raw: any): AuctionData | null {
  if (!raw) return null;

  const seller = raw.seller ?? raw[0];
  const domain = raw.domain ?? raw[1];
  const biddingOpensRaw = raw.biddingOpens ?? raw[2];
  const biddingClosesRaw = raw.biddingCloses ?? raw[3];
  const startingBidWeiRaw = raw.startingBidWei ?? raw[4];
  const bidCountRaw = raw.bidCount ?? raw[5];
  const endedRaw = raw.ended ?? raw[6];
  const exists = raw.exists ?? raw[7];

  if (!exists) return null;

  const biddingOpens = BigInt(biddingOpensRaw);
  const biddingCloses = BigInt(biddingClosesRaw);
  const startingBidWei = BigInt(startingBidWeiRaw);
  const bidCount = Number(bidCountRaw);
  const ended = Boolean(endedRaw);

  if (!seller || !domain) return null;

  const status = deriveStatus(biddingOpens, biddingCloses, ended);
  const timeTarget = status === 'upcoming' ? biddingOpens : biddingCloses;

  return {
    auctionId,
    seller,
    domain,
    biddingOpens,
    biddingCloses,
    startingBidWei,
    bidCount,
    ended,
    status,
    isBiddingOpen: status === 'active',
    timeLeft: formatTimeLeft(timeTarget, status),
  };
}

export function useAllAuctions() {
  const publicClient = usePublicClient({ chainId: sepolia.id });

  const [auctions, setAuctions] = useState<AuctionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!publicClient || !CONTRACT_ADDRESS) return;

    try {
      setIsLoading(true);
      setError(null);

      const ids = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: DOMAIN_VAULT_ABI,
        functionName: 'getAuctionIds',
      })) as `0x${string}`[];

      if (!ids || ids.length === 0) {
        setAuctions([]);
        return;
      }

      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const data = await publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: DOMAIN_VAULT_ABI,
              functionName: 'getAuction',
              args: [id],
            });
            return mapAuctionData(id, data);
          } catch (err) {
            console.error('[useAllAuctions] Failed to load auction', id, err);
            return null;
          }
        }),
      );

      setAuctions(results.filter((a): a is AuctionData => Boolean(a)));
    } catch (err) {
      console.error('[useAllAuctions] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch auctions');
    } finally {
      setIsLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { auctions, isLoading, error, refetch: fetchData };
}

export function useAuction(auctionId: string | undefined) {
  const publicClient = usePublicClient({ chainId: sepolia.id });

  const [auction, setAuction] = useState<AuctionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!auctionId || !publicClient || !CONTRACT_ADDRESS) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: DOMAIN_VAULT_ABI,
        functionName: 'getAuction',
        args: [auctionId as `0x${string}`],
      });

      setAuction(mapAuctionData(auctionId as `0x${string}`, data));
    } catch (err) {
      console.error('[useAuction] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch auction');
    } finally {
      setIsLoading(false);
    }
  }, [auctionId, publicClient]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { auction, isLoading, error, refetch: fetchData };
}
