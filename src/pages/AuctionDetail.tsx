/**
 * Auction Detail Page - fhEVM 0.9.x sealed-bid detail view.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Shield, User, Calendar, Lock } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatEther } from 'viem';
import Navbar from '@/components/Navbar';
import DomainBidForm from '@/components/DomainBidForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuction } from '@/hooks/useAuctions';
import { useAccount } from 'wagmi';
import { useFinalizeAuction, useGrantView, useEncryptedResult } from '@/hooks/useDomainVault';

export default function AuctionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { auction, isLoading, error } = useAuction(id);
  const { address } = useAccount();
  const { finalize, isPending: isFinalizing } = useFinalizeAuction();
  const { grantView, isPending: isGranting } = useGrantView();
  const { highestBid, winner, error: encryptedError } = useEncryptedResult(
    auction?.auctionId,
    Boolean(auction?.ended),
  );
  const [viewerAddress, setViewerAddress] = useState('');

  useEffect(() => {
    if (!id) {
      navigate('/auction', { replace: true });
    }
  }, [id, navigate]);

  if (isLoading || !auction) {
    return (
      <div className="min-h-screen gradient-dark flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-accent mx-auto mb-4 animate-pulse" />
          <p className="text-xl text-muted-foreground">
            {error ? 'Failed to load auction' : 'Loading auction details...'}
          </p>
        </div>
      </div>
    );
  }

  // Not found
  if (error || !auction) {
    return (
      <div className="min-h-screen gradient-dark flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-2" />
          <p className="text-muted-foreground">Auction not found</p>
          <button
            className="px-4 py-2 rounded bg-primary text-white"
            onClick={() => navigate('/auction')}
          >
            Back to list
          </button>
        </div>
      </div>
    );
  }

  const statusBadge = {
    upcoming: { label: 'Upcoming', color: 'bg-amber-500/10 text-amber-400 border-amber-400/30' },
    active: { label: 'Active', color: 'bg-green-500/10 text-green-400 border-green-400/30' },
    ended: { label: 'Ended', color: 'bg-gray-500/10 text-gray-300 border-gray-400/30' },
  }[auction.status];

  const biddingOpens = new Date(Number(auction.biddingOpens) * 1000).toLocaleString();
  const biddingCloses = new Date(Number(auction.biddingCloses) * 1000).toLocaleString();

  return (
    <div className="min-h-screen gradient-dark">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Auction summary */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-accent/20 bg-surface/30 backdrop-blur">
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-4xl font-semibold tracking-wide text-accent">DV</div>
                    <Badge variant="outline" className={`gap-1 ${statusBadge.color}`}>
                      <Shield className="w-3 h-3" />
                      {statusBadge.label}
                    </Badge>
                  </div>
                  <CardTitle className="text-4xl mb-2 break-all">{auction.domain}</CardTitle>
                  <CardDescription className="text-base">
                    Encrypted sealed-bid auction for {auction.domain}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <p className="text-xl font-bold text-electric">{auction.timeLeft}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Starting Bid</p>
                      <p className="text-xl font-bold">{formatEther(auction.startingBidWei)} ETH</p>
                    </div>
                    <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Total Bids</p>
                      <p className="text-xl font-bold">{auction.bidCount}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Seller</p>
                      <p className="text-sm font-mono truncate">{auction.seller}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <Card className="border-accent/20 bg-surface/30 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="w-4 h-4" />
                    Auction Window
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Opens</span>
                    <span>{biddingOpens}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Closes</span>
                    <span>{biddingCloses}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-accent/20 bg-surface/30 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="w-4 h-4" />
                    Seller
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground break-all">
                  {auction.seller}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Bid form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-6"
          >
            <Card className="border-electric/20 bg-surface/30 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Submit Encrypted Bid
                </CardTitle>
                <CardDescription>
                  Bids are encrypted client-side via Relayer SDK 0.3.0-5
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auction.status === 'ended' ? (
                  <p className="text-sm text-amber-400">Auction has ended.</p>
                ) : auction.status === 'upcoming' ? (
                  <p className="text-sm text-muted-foreground">Auction not open yet.</p>
                ) : (
                  <DomainBidForm
                    domainName={auction.domain}
                    auctionId={auction.auctionId}
                  />
                )}
              </CardContent>
            </Card>

            {/* Seller actions & ciphertexts */}
            <Card className="border-accent/20 bg-surface/30 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg">Settlement & Ciphertexts</CardTitle>
                <CardDescription>Only the seller can finalize or grant view access</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {encryptedError && (
                  <p className="text-xs text-amber-400">
                    {encryptedError.includes('AuctionActive')
                      ? 'Result only available after auction ends.'
                      : encryptedError}
                  </p>
                )}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Highest Bid (ciphertext)</p>
                  <p className="text-xs font-mono break-all">{highestBid || '--'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Winner (ciphertext)</p>
                  <p className="text-xs font-mono break-all">{winner || '--'}</p>
                </div>

                {address && address.toLowerCase() === auction.seller.toLowerCase() && (
                  <div className="space-y-3">
                    <Button
                      className="w-full"
                      disabled={isFinalizing || auction.ended || auction.status !== 'ended'}
                      onClick={() => finalize(auction.auctionId)}
                    >
                      {auction.ended ? 'Already finalized' : isFinalizing ? 'Finalizing...' : 'Finalize Auction'}
                    </Button>

                    <div className="space-y-2">
                      <Input
                        placeholder="Viewer address (0x...)"
                        value={viewerAddress}
                        onChange={(e) => setViewerAddress(e.target.value)}
                        disabled={isGranting}
                      />
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={isGranting || !viewerAddress}
                        onClick={() => grantView(auction.auctionId, viewerAddress as `0x${string}`)}
                      >
                        {isGranting ? 'Granting...' : 'Grant View Access'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
