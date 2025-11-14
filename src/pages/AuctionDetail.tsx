/**
 * Auction Detail Page - Individual Domain Auction
 *
 * Detailed view of a single domain auction with bidding interface.
 * Users can view auction details, bid history, and submit encrypted bids.
 *
 * Features:
 * - Domain auction information display
 * - Real-time countdown timer
 * - Encrypted bid submission form
 * - Bid history timeline
 * - FHE encryption explanation
 * - Seller information
 *
 * @page
 */

import { motion } from "framer-motion";
import { Clock, Shield, TrendingUp, User, Calendar, Lock } from "lucide-react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DomainBidForm from "@/components/DomainBidForm";
import Navbar from "@/components/Navbar";

// Mock auction detail data - will be replaced with smart contract data
const getAuctionDetail = (id: string) => {
  const auctions: Record<string, any> = {
    "1": {
      id: "1",
      domain: "crypto.eth",
      description: "Premium crypto domain name - perfect for cryptocurrency projects, exchanges, or educational platforms.",
      currentBid: "5.2 ETH",
      minBid: "5.3 ETH",
      totalBids: 12,
      timeLeft: "2h 34m",
      endTime: "2024-11-01 15:30:00",
      status: "active",
      image: "🔐",
      seller: "0x1234...5678",
      startingBid: "1.0 ETH",
      bidHistory: [
        { bidder: "0xabcd...ef12", amount: "5.2 ETH", time: "5 minutes ago", encrypted: true },
        { bidder: "0x9876...5432", amount: "Encrypted", time: "23 minutes ago", encrypted: true },
        { bidder: "0xdef0...9abc", amount: "Encrypted", time: "1 hour ago", encrypted: true },
        { bidder: "0x5555...7777", amount: "Encrypted", time: "2 hours ago", encrypted: true },
      ],
    },
    "2": {
      id: "2",
      domain: "web3.eth",
      description: "Popular web3 domain - ideal for Web3 development tools, frameworks, or community platforms.",
      currentBid: "3.8 ETH",
      minBid: "3.9 ETH",
      totalBids: 8,
      timeLeft: "5h 12m",
      endTime: "2024-11-01 18:12:00",
      status: "active",
      image: "🌐",
      seller: "0x2345...6789",
      startingBid: "0.5 ETH",
      bidHistory: [
        { bidder: "0xbcde...f123", amount: "3.8 ETH", time: "12 minutes ago", encrypted: true },
        { bidder: "0x8765...4321", amount: "Encrypted", time: "45 minutes ago", encrypted: true },
        { bidder: "0xef01...abcd", amount: "Encrypted", time: "2 hours ago", encrypted: true },
      ],
    },
  };

  return auctions[id] || auctions["1"];
};

/**
 * Auction Detail Component
 * Displays detailed information and bidding interface for a specific auction
 */
export default function AuctionDetail() {
  const { id } = useParams<{ id: string }>();
  const auction = getAuctionDetail(id || "1");

  return (
    <div className="min-h-screen gradient-dark">
      {/* Navigation Bar */}
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Domain Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-accent/20 bg-surface/30 backdrop-blur">
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-6xl">{auction.image}</div>
                    <Badge variant={auction.status === "ending-soon" ? "destructive" : "default"} className="gap-1">
                      <Shield className="w-3 h-3" />
                      {auction.status === "active" ? "Active" : "Ending Soon"}
                    </Badge>
                  </div>
                  <CardTitle className="text-4xl mb-2">{auction.domain}</CardTitle>
                  <CardDescription className="text-base">{auction.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Current Bid</p>
                      <p className="text-xl font-bold text-accent">{auction.currentBid}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Total Bids</p>
                      <p className="text-xl font-bold">{auction.totalBids}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Time Left</p>
                      <p className="text-xl font-bold text-electric">{auction.timeLeft}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Starting Bid</p>
                      <p className="text-xl font-bold">{auction.startingBid}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Bid Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <DomainBidForm domainName={auction.domain} />
            </motion.div>

            {/* Auction Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="border-accent/20 bg-surface/30 backdrop-blur">
                <CardHeader>
                  <CardTitle>Auction Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                    <User className="w-5 h-5 text-accent" />
                    <div>
                      <p className="text-sm font-medium">Seller</p>
                      <p className="text-sm text-muted-foreground">{auction.seller}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                    <Calendar className="w-5 h-5 text-accent" />
                    <div>
                      <p className="text-sm font-medium">Auction End Time</p>
                      <p className="text-sm text-muted-foreground">{auction.endTime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                    <Lock className="w-5 h-5 text-accent" />
                    <div>
                      <p className="text-sm font-medium">Encryption Status</p>
                      <p className="text-sm text-muted-foreground">All bids encrypted with FHE technology</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar - Right Side */}
          <div className="space-y-6">
            {/* Bid History */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="border-accent/20 bg-surface/30 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Bid History
                  </CardTitle>
                  <CardDescription>
                    Recent bidding activity (amounts encrypted)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {auction.bidHistory.map((bid: any, index: number) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg bg-background/50 border border-border/50"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-accent" />
                            <span className="font-mono text-sm">{bid.bidder}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{bid.time}</span>
                          {bid.encrypted && (
                            <Badge variant="outline" className="gap-1">
                              <Lock className="w-3 h-3" />
                              Encrypted
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* FHE Explanation */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="border-electric/20 bg-surface/30 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-xl">About FHE Encryption</CardTitle>
                  <CardDescription>
                    Fully Homomorphic Encryption (FHE) protects your bids
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-accent">1</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">Local Encryption</p>
                        <p className="text-xs text-muted-foreground">
                          Bid amount encrypted in your browser
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-accent">2</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">Sealed Submission</p>
                        <p className="text-xs text-muted-foreground">
                          Encrypted data sent to blockchain
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-accent">3</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">Reveal Phase</p>
                        <p className="text-xs text-muted-foreground">
                          Bids decrypted after deadline
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
