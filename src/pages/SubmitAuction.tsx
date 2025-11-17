/**
 * Submit Auction Page - Create New Domain Auction
 *
 * Form for sellers to list new domains for auction.
 * Allows configuration of auction parameters and domain details.
 *
 * Features:
 * - Domain information input
 * - Auction duration settings
 * - Starting bid configuration
 * - Preview before submission
 * - Smart contract integration for creating drops
 *
 * @page
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, DollarSign, FileText, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { useAccount, usePublicClient } from "wagmi";
import { useNavigate } from "react-router-dom";
import { keccak256, toUtf8Bytes } from "ethers";
import { useCreateAuction } from "@/hooks/useDomainVault";

/**
 * Submit Auction Component
 * Form interface for creating new domain auctions
 */
export default function SubmitAuction() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { createAuction, isPending } = useCreateAuction();
  const publicClient = usePublicClient();

  // Form state
  const [formData, setFormData] = useState({
    domain: "",
    startingBid: "",
    durationDays: "7",
  });

  // Auto-generate emoji based on domain name
  const getEmojiForDomain = (domain: string): string => {
    const emojis = ["🔐", "🌐", "💰", "🎨", "🏛️", "🌌", "⚡", "🔥", "💎", "🚀"];
    // Simple hash to get consistent emoji for same domain
    const hash = domain.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return emojis[hash % emojis.length];
  };

  // Auto-generate description if not provided
  const getAutoDescription = (domain: string): string => {
    return `Premium ${domain} domain name - perfect for web3 projects and decentralized applications.`;
  };

  /**
   * Handle form field changes
   */
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address) {
      toast({
        title: "Wallet Required",
        description: "请先连接具有管理员权限的钱包后再创建拍卖。",
        variant: "destructive",
      });
      return;
    }

    // Check if the connected wallet is the authorized admin
    const AUTHORIZED_ADMIN = "0x53f82210204EE87a485E288E0644E195360F4EBc";
    if (address.toLowerCase() !== AUTHORIZED_ADMIN.toLowerCase()) {
      toast({
        title: "Unauthorized Wallet",
        description: `Only the contract admin can create auctions. Please switch to: ${AUTHORIZED_ADMIN.slice(0, 6)}...${AUTHORIZED_ADMIN.slice(-4)}`,
        variant: "destructive",
      });
      console.error('[SubmitAuction] Wallet mismatch:', {
        connected: address,
        required: AUTHORIZED_ADMIN,
      });
      return;
    }

    try {
      const durationDays = parseInt(formData.durationDays, 10);
      if (Number.isNaN(durationDays) || durationDays <= 0) {
        toast({
          title: "Invalid Duration",
          description: "Auction duration must be at least 1 day.",
          variant: "destructive",
        });
        return;
      }

      const durationSeconds = Math.max(durationDays * 24 * 60 * 60, 3600);

      let referenceTimestamp: number;
      if (publicClient) {
        const latestBlock = await publicClient.getBlock({ blockTag: "latest" });
        referenceTimestamp = Number(latestBlock?.timestamp ?? Math.floor(Date.now() / 1000));
      } else {
        referenceTimestamp = Math.floor(Date.now() / 1000);
      }

      console.log('[SubmitAuction] Creating auction:', {
        domain: formData.domain,
        startingBid: formData.startingBid,
        durationDays,
        durationSeconds,
      });

      // Generate unique drop ID (domain + timestamp + random nonce)
      // This ensures each auction has a unique ID even for the same domain
      const nonce = Math.floor(Math.random() * 1000000);
      const auctionIdInput = `${formData.domain}-${referenceTimestamp}-${nonce}`;
      const auctionId = keccak256(toUtf8Bytes(auctionIdInput));

      console.log('[SubmitAuction] Generated auctionId:', {
        input: auctionIdInput,
        hash: auctionId,
      });

      // Call contract
      const txHash = await createAuction(
        auctionId as `0x${string}`,
        formData.domain,
        durationSeconds,
        formData.startingBid,
      );

      console.log('[SubmitAuction] Transaction hash:', txHash);

      // Navigate to auction list after success
      toast({
        title: "Auction Created Successfully!",
        description: `${formData.domain} has been listed. Redirecting to auctions...`,
      });

      // Reset form
      setFormData({
        domain: "",
        startingBid: "",
        durationDays: "7",
      });

      // Navigate to auction list after short delay
      setTimeout(() => {
        navigate('/auction');
      }, 2000);
    } catch (error) {
      console.error('[SubmitAuction] Create auction failed:', error);
      const message = error instanceof Error ? error.message : "Failed to create auction. Please try again.";
      toast({
        title: "Submission Failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen gradient-dark">
      {/* Navigation Bar */}
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="border-accent/20 bg-surface/30 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-3xl">Create New Auction</CardTitle>
                <CardDescription>
                  List your domain for encrypted bidding. All bids will be protected by FHE technology.
                </CardDescription>
                {isConnected && address && (
                  <div className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="text-sm font-medium mb-1">Connected Wallet:</p>
                    <p className="text-xs font-mono text-accent">{address}</p>
                    {address.toLowerCase() === "0x53f82210204EE87a485E288E0644E195360F4EBc".toLowerCase() ? (
                      <p className="text-xs text-green-400 mt-1">✅ Authorized to create auctions</p>
                    ) : (
                      <p className="text-xs text-red-400 mt-1">❌ Not authorized - switch to 0x53f8...4ebc</p>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Domain Name */}
                  <div className="space-y-2">
                    <Label htmlFor="domain" className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Domain Name
                    </Label>
                    <Input
                      id="domain"
                      type="text"
                      placeholder="example.eth"
                      value={formData.domain}
                      onChange={(e) => handleChange("domain", e.target.value)}
                      className="bg-background/50 border-accent/20"
                      disabled={isPending}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the full domain name you want to auction
                    </p>
                  </div>

                  {/* Starting Bid */}
                  <div className="space-y-2">
                    <Label htmlFor="startingBid" className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Starting Bid (ETH)
                    </Label>
                    <Input
                      id="startingBid"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.startingBid}
                      onChange={(e) => handleChange("startingBid", e.target.value)}
                      className="bg-background/50 border-accent/20"
                      disabled={isPending}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum bid amount in ETH
                    </p>
                  </div>

                  {/* Auction Duration */}
                  <div className="space-y-2">
                    <Label htmlFor="durationDays" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Auction Duration (Days)
                    </Label>
                    <Input
                      id="durationDays"
                      type="number"
                      min="1"
                      max="60"
                      value={formData.durationDays}
                      onChange={(e) => handleChange("durationDays", e.target.value)}
                      className="bg-background/50 border-accent/20"
                      disabled={isPending}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Auctions start a few seconds after submission and run for the specified number of days. Minimum duration is 1 day.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-4 pt-4">
                    <Link to="/auction" className="flex-1">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-accent/20"
                      >
                        Cancel
                      </Button>
                    </Link>
                    <Button
                      type="submit"
                      className="flex-1 bg-primary hover:bg-primary-light gap-2"
                      disabled={isPending}
                    >
                      {isPending ? (
                        <>
                          <Send className="w-4 h-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Create Auction
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Info Box */}
                  <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                <p className="text-sm text-muted-foreground">
                      <strong className="text-accent">Note:</strong> Once created, the auction starts automatically and cannot be cancelled.
                      All bids remain encrypted until the reveal window.
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Information Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8"
          >
            <Card className="border-accent/20 bg-surface/30 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>1. Choose your domain, reserve price, and duration</p>
                <p>2. Auction begins automatically within a few seconds</p>
                <p>3. Bidders submit encrypted bids during the duration</p>
                <p>4. After closing, bids are revealed and the winner is paid</p>
              </CardContent>
            </Card>

            <Card className="border-accent/20 bg-surface/30 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg">Fees & Payments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• No listing fee required</p>
                <p>• 2.5% platform fee on final sale</p>
                <p>• Payment received after reveal phase</p>
                <p>• Gas fees apply for transactions</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
