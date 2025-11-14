/**
 * Auction List Page - Browse All Active Auctions
 *
 * Main marketplace interface displaying all available domain auctions.
 * Users can browse, filter, and navigate to individual auction pages.
 *
 * Features:
 * - Grid/List view of active auctions
 * - Tab navigation: All Auctions / My Auctions
 * - Real-time auction statistics
 * - Filtering and sorting options
 * - Navigation to auction details
 * - Management actions for auction creators
 * - Link to submit new auction items
 *
 * @page
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Filter, Clock, TrendingUp, Shield, Settings, PlayCircle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/Navbar";
import {
  useRequestReveal,
  useReleaseEscrow,
  useUpdateDropSchedule,
  useCancelDrop
} from "@/hooks/useDomainVault";

// Mock auction data - will be replaced with smart contract data
// Note: In production, this will come from smart contract queries
const mockAuctions = [
  {
    id: "1",
    dropId: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    domain: "crypto.eth",
    description: "Premium crypto domain name",
    currentBid: "5.2 ETH",
    totalBids: 12,
    timeLeft: "2h 34m",
    biddingCloses: Math.floor(Date.now() / 1000) + 9240, // 2h 34m from now
    status: "active",
    image: "🔐",
    creator: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", // Example address
    revealRequested: false,
    revealRecorded: false,
    escrowSettled: false,
  },
  {
    id: "2",
    dropId: "0x2234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    domain: "web3.eth",
    description: "Popular web3 domain",
    currentBid: "3.8 ETH",
    totalBids: 8,
    timeLeft: "5h 12m",
    biddingCloses: Math.floor(Date.now() / 1000) + 18720,
    status: "active",
    image: "🌐",
    creator: "0x8a3f82D6634C0532925a3b844Bc9e7595f0bEb",
    revealRequested: false,
    revealRecorded: false,
    escrowSettled: false,
  },
  {
    id: "3",
    dropId: "0x3234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    domain: "defi.eth",
    description: "DeFi focused domain name",
    currentBid: "4.5 ETH",
    totalBids: 15,
    timeLeft: "1h 45m",
    biddingCloses: Math.floor(Date.now() / 1000) + 6300,
    status: "ending-soon",
    image: "💰",
    creator: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    revealRequested: false,
    revealRecorded: false,
    escrowSettled: false,
  },
  {
    id: "4",
    dropId: "0x4234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    domain: "nft.eth",
    description: "NFT marketplace domain",
    currentBid: "6.1 ETH",
    totalBids: 20,
    timeLeft: "8h 20m",
    biddingCloses: Math.floor(Date.now() / 1000) + 30000,
    status: "active",
    image: "🎨",
    creator: "0x9b2e82D6634C0532925a3b844Bc9e7595f0bEb",
    revealRequested: false,
    revealRecorded: false,
    escrowSettled: false,
  },
  {
    id: "5",
    dropId: "0x5234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    domain: "dao.eth",
    description: "DAO governance domain",
    currentBid: "2.9 ETH",
    totalBids: 7,
    timeLeft: "Ended - Awaiting Reveal",
    biddingCloses: Math.floor(Date.now() / 1000) - 3600, // Ended 1h ago
    status: "awaiting-reveal",
    image: "🏛️",
    creator: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    revealRequested: false,
    revealRecorded: false,
    escrowSettled: false,
  },
  {
    id: "6",
    dropId: "0x6234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    domain: "metaverse.eth",
    description: "Metaverse platform domain",
    currentBid: "7.3 ETH",
    totalBids: 18,
    timeLeft: "Completed",
    biddingCloses: Math.floor(Date.now() / 1000) - 86400, // Ended 1 day ago
    status: "completed",
    image: "🌌",
    creator: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    revealRequested: true,
    revealRecorded: true,
    escrowSettled: false,
    winner: "0xabc123...",
  },
];

/**
 * Auction Card with Management Actions
 */
interface AuctionCardProps {
  auction: typeof mockAuctions[0];
  isOwner: boolean;
}

function AuctionCard({ auction, isOwner }: AuctionCardProps) {
  const { requestReveal, isRequesting } = useRequestReveal();
  const { releaseEscrow, isReleasing } = useReleaseEscrow();
  const { cancelDrop, isCanceling } = useCancelDrop();

  const now = Math.floor(Date.now() / 1000);
  const hasEnded = now >= auction.biddingCloses;
  const canReveal = hasEnded && !auction.revealRequested && isOwner;
  const canRelease = auction.revealRecorded && !auction.escrowSettled && isOwner;

  const handleRequestReveal = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await requestReveal(auction.dropId);
    } catch (error) {
      console.error('Failed to request reveal:', error);
    }
  };

  const handleReleaseEscrow = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await releaseEscrow(auction.dropId);
    } catch (error) {
      console.error('Failed to release escrow:', error);
    }
  };

  const handleCancelDrop = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm(`Are you sure you want to cancel the auction for ${auction.domain}?`)) {
      try {
        await cancelDrop(auction.dropId);
      } catch (error) {
        console.error('Failed to cancel drop:', error);
      }
    }
  };

  return (
    <Card className="border-accent/20 bg-surface/30 backdrop-blur hover:border-accent/40 transition-all hover:shadow-lg hover:shadow-accent/10 h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <div className="text-4xl">{auction.image}</div>
          <div className="flex flex-col gap-2">
            {auction.status === "ending-soon" && (
              <Badge variant="destructive" className="gap-1">
                <Clock className="w-3 h-3" />
                Ending Soon
              </Badge>
            )}
            {auction.status === "awaiting-reveal" && (
              <Badge variant="secondary" className="gap-1">
                <PlayCircle className="w-3 h-3" />
                Awaiting Reveal
              </Badge>
            )}
            {auction.status === "completed" && (
              <Badge variant="default" className="gap-1 bg-green-600">
                Completed
              </Badge>
            )}
            {isOwner && (
              <Badge variant="outline" className="gap-1 border-accent text-accent">
                <Settings className="w-3 h-3" />
                Your Auction
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-xl">{auction.domain}</CardTitle>
        <CardDescription>{auction.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-3 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Bid</span>
            <span className="text-lg font-bold text-accent">{auction.currentBid}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Bids</span>
            <span className="text-sm font-medium">{auction.totalBids}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {hasEnded ? "Status" : "Time Left"}
            </span>
            <span className={`text-sm font-medium ${hasEnded ? 'text-yellow-500' : 'text-electric'}`}>
              {auction.timeLeft}
            </span>
          </div>
        </div>

        {/* Management Actions for Owner */}
        {isOwner && (
          <div className="mt-4 space-y-2 pt-4 border-t border-border/50">
            {canReveal && (
              <Button
                onClick={handleRequestReveal}
                disabled={isRequesting}
                variant="outline"
                size="sm"
                className="w-full gap-2 border-accent text-accent hover:bg-accent/10"
              >
                <PlayCircle className="w-4 h-4" />
                {isRequesting ? 'Requesting...' : 'Request Reveal'}
              </Button>
            )}
            {canRelease && (
              <Button
                onClick={handleReleaseEscrow}
                disabled={isReleasing}
                variant="outline"
                size="sm"
                className="w-full gap-2 border-green-600 text-green-600 hover:bg-green-600/10"
              >
                <TrendingUp className="w-4 h-4" />
                {isReleasing ? 'Releasing...' : 'Release Escrow'}
              </Button>
            )}
            {auction.status === "active" && !hasEnded && (
              <Button
                onClick={handleCancelDrop}
                disabled={isCanceling}
                variant="outline"
                size="sm"
                className="w-full gap-2 border-red-600 text-red-600 hover:bg-red-600/10"
              >
                <XCircle className="w-4 h-4" />
                {isCanceling ? 'Canceling...' : 'Cancel Auction'}
              </Button>
            )}
          </div>
        )}

        {/* View Details Button */}
        <Link to={`/auction/${auction.id}`} className="block mt-4">
          <Button className="w-full bg-primary hover:bg-primary-light">
            View Auction
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * Auction List Component
 * Displays all active domain auctions in a grid layout with tab navigation
 */
export default function AuctionList() {
  const { address } = useAccount();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Filter auctions based on search and tab
  const filteredAuctions = mockAuctions.filter(auction => {
    const matchesSearch = auction.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         auction.description.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === "my") {
      return matchesSearch && address && auction.creator.toLowerCase() === address.toLowerCase();
    }

    return matchesSearch;
  });

  const myAuctionsCount = address
    ? mockAuctions.filter(a => a.creator.toLowerCase() === address.toLowerCase()).length
    : 0;

  return (
    <div className="min-h-screen gradient-dark">
      {/* Navigation Bar */}
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        {/* Stats Bar */}
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
                  <p className="text-3xl font-bold text-foreground">127</p>
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
                  <p className="text-sm text-muted-foreground">Ending Soon</p>
                  <p className="text-3xl font-bold text-foreground">23</p>
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
                  <p className="text-sm text-muted-foreground">Total Volume (24h)</p>
                  <p className="text-3xl font-bold text-foreground">234 ETH</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <TabsList className="bg-surface/50 border border-accent/20">
                <TabsTrigger value="all" className="data-[state=active]:bg-primary">
                  All Auctions ({mockAuctions.length})
                </TabsTrigger>
                <TabsTrigger value="my" className="data-[state=active]:bg-primary">
                  My Auctions ({myAuctionsCount})
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 flex gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search domains..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-surface/30 border-accent/20"
                  />
                </div>

                {/* Submit Auction Button */}
                <Link to="/submit-auction">
                  <Button className="gap-2 bg-primary hover:bg-primary-light">
                    <Plus className="w-4 h-4" />
                    Submit Item
                  </Button>
                </Link>
              </div>
            </div>

            {/* All Auctions Tab */}
            <TabsContent value="all" className="mt-0">
              {filteredAuctions.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">No Auctions Found</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchTerm ? 'Try a different search term' : 'Be the first to submit an auction item'}
                  </p>
                  {!searchTerm && (
                    <Link to="/submit-auction">
                      <Button className="gap-2 bg-primary hover:bg-primary-light">
                        <Plus className="w-4 h-4" />
                        Submit First Item
                      </Button>
                    </Link>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {filteredAuctions.map((auction, index) => (
                    <motion.div
                      key={auction.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.05 * index }}
                    >
                      <AuctionCard
                        auction={auction}
                        isOwner={address?.toLowerCase() === auction.creator.toLowerCase()}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </TabsContent>

            {/* My Auctions Tab */}
            <TabsContent value="my" className="mt-0">
              {!address ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Connect Your Wallet</h3>
                  <p className="text-muted-foreground mb-6">
                    Connect your wallet to view your auctions
                  </p>
                </motion.div>
              ) : filteredAuctions.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">No Auctions Created</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchTerm ? 'No matching auctions found' : 'You haven\'t created any auctions yet'}
                  </p>
                  {!searchTerm && (
                    <Link to="/submit-auction">
                      <Button className="gap-2 bg-primary hover:bg-primary-light">
                        <Plus className="w-4 h-4" />
                        Create Your First Auction
                      </Button>
                    </Link>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {filteredAuctions.map((auction, index) => (
                    <motion.div
                      key={auction.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.05 * index }}
                    >
                      <AuctionCard auction={auction} isOwner={true} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
