/**
 * Auction List Page - simplified list for fhEVM 0.9.x contract.
 */

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Clock, Shield, TrendingUp, CheckCircle2, Hourglass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';

import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAllAuctions, type AuctionData } from '@/hooks/useAuctions';
import { formatEther } from 'viem';

interface AuctionCardProps {
  auction: AuctionData;
  isOwner: boolean;
}

function AuctionCard({ auction, isOwner }: AuctionCardProps) {
  const statusBadge = {
    upcoming: { label: 'Upcoming', color: 'bg-amber-500/10 text-amber-400 border-amber-400/30' },
    active: { label: 'Active', color: 'bg-green-500/10 text-green-400 border-green-400/30' },
    ended: { label: 'Ended', color: 'bg-gray-500/10 text-gray-300 border-gray-400/30' },
  }[auction.status];

  return (
    <Card className="border-accent/20 bg-surface/30 backdrop-blur hover:border-accent/40 transition-all hover:shadow-lg hover:shadow-accent/10 h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <div className="text-2xl font-semibold text-accent">DV</div>
          <div className="flex flex-col gap-2 items-end">
            <Badge variant="outline" className={`gap-1 ${statusBadge.color}`}>
              <Shield className="w-3 h-3" />
              {statusBadge.label}
            </Badge>
            {isOwner && (
              <Badge variant="outline" className="gap-1 border-accent text-accent">
                <CheckCircle2 className="w-3 h-3" />
                You are seller
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-xl break-all">{auction.domain}</CardTitle>
        <CardDescription>Encrypted auction for {auction.domain}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Starting Bid</span>
          <span className="text-lg font-bold">{formatEther(auction.startingBidWei)} ETH</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {auction.status === 'upcoming' ? 'Opens in' : auction.status === 'ended' ? 'Status' : 'Time left'}
          </span>
          <span className={auction.status === 'ended' ? 'text-amber-400' : 'text-electric'}>
            {auction.timeLeft}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Bids</span>
          <span>{auction.bidCount}</span>
        </div>

        <div className="mt-auto pt-2">
          <Link to={`/auction/${auction.auctionId}`} className="block">
            <Button variant="default" className="w-full bg-primary hover:bg-primary-light">
              View Auction
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AuctionList() {
  const { address } = useAccount();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'active'>('all');

  const { auctions, isLoading, error } = useAllAuctions();

  const filteredAuctions = useMemo(() => {
    return auctions.filter((auction) => {
      const matchesSearch = auction.domain.toLowerCase().includes(searchTerm.toLowerCase());
      if (activeTab === 'my') {
        return matchesSearch && address && auction.seller.toLowerCase() === address.toLowerCase();
      }
      if (activeTab === 'active') {
        return matchesSearch && auction.status === 'active';
      }
      return matchesSearch;
    });
  }, [auctions, searchTerm, activeTab, address]);

  const activeCount = auctions.filter((a) => a.status === 'active').length;
  const endingSoonCount = auctions.filter(
    (a) => a.status === 'active' && Number(a.biddingCloses) - Math.floor(Date.now() / 1000) <= 3600,
  ).length;

  return (
    <div className="min-h-screen gradient-dark">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          <Card className="border-accent/20 bg-surface/30 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-accent/10">
                  <Shield className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Auctions</p>
                  <p className="text-3xl font-bold text-foreground">{activeCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-accent/20 bg-surface/30 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-electric/10">
                  <Clock className="w-6 h-6 text-electric" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ending Soon (&lt;1h)</p>
                  <p className="text-3xl font-bold text-foreground">{endingSoonCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-accent/20 bg-surface/30 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Auctions</p>
                  <p className="text-3xl font-bold text-foreground">{auctions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full md:w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="my">My Auctions</TabsTrigger>
            </TabsList>
            <TabsContent value="all" />
            <TabsContent value="active" />
            <TabsContent value="my" />
          </Tabs>

          <div className="flex-1 md:max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search domains..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Link to="/submit-auction">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Auction
            </Button>
          </Link>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
            <Hourglass className="w-5 h-5 animate-spin" />
            Loading auctions...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-24 text-red-400">
            Failed to load auctions: {error}
          </div>
        ) : filteredAuctions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
            <Shield className="w-10 h-10" />
            <p>No auctions found</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredAuctions.map((auction) => (
              <AuctionCard
                key={auction.auctionId}
                auction={auction}
                isOwner={Boolean(address && auction.seller.toLowerCase() === address.toLowerCase())}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
