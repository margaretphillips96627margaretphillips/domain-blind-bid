/**
 * Domain Bid Form Component
 *
 * Main form for submitting encrypted domain bids to the DomainVaultAuction contract.
 * Features:
 * - Local FHE encryption of bid amounts before blockchain submission
 * - Real-time validation of bid and escrow amounts
 * - Integration with Wagmi hooks for wallet and network management
 * - User-friendly status feedback during encryption and transaction submission
 * - Automatic drop ID generation from domain names
 *
 * @component
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Loader2, CheckCircle2, Shield, AlertCircle, Wallet } from "lucide-react";
import { useAccount } from 'wagmi';
import { keccak256, toUtf8Bytes } from 'ethers';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useSubmitBid } from "@/hooks/useDomainVault";
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface DomainBidFormProps {
  /** Domain name to bid on (if provided, domain input will be hidden) */
  domainName?: string;
}

export default function DomainBidForm({ domainName: propDomainName }: DomainBidFormProps = {}) {
  const { address, isConnected } = useAccount();
  const { submitBid, isSubmitting, isEncrypting, isProcessing } = useSubmitBid();

  const [domainName, setDomainName] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [additionalEscrow, setAdditionalEscrow] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [txHash, setTxHash] = useState("");

  // Update domain name if prop changes
  useEffect(() => {
    if (propDomainName) {
      setDomainName(propDomainName);
    }
  }, [propDomainName]);

  // Calculate total escrow amount
  const getTotalEscrow = (): string => {
    const bid = parseFloat(bidAmount) || 0;
    const additional = parseFloat(additionalEscrow) || 0;
    return (bid + additional).toFixed(3);
  };

  /**
   * Generate drop ID from domain name
   * In production, this would be fetched from backend or contract
   */
  const generateDropId = (domain: string): string => {
    return keccak256(toUtf8Bytes(domain));
  };

  /**
   * Handle bid submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!domainName || !bidAmount) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    const bidNum = parseFloat(bidAmount);
    const totalEscrow = parseFloat(getTotalEscrow());

    if (isNaN(bidNum) || bidNum <= 0) {
      toast.error("Bid amount must be greater than 0");
      return;
    }

    try {
      // Generate drop ID from domain name
      const dropId = generateDropId(domainName);
      console.log('[BidForm] Submitting bid for domain:', domainName);
      console.log('[BidForm] Drop ID:', dropId);
      console.log('[BidForm] Bid amount:', bidAmount, 'ETH');
      console.log('[BidForm] Total escrow amount:', totalEscrow, 'ETH');

      // Submit encrypted bid (escrow = bid + additional)
      const hash = await submitBid(dropId, bidAmount, getTotalEscrow());

      setTxHash(hash);

      // Reset form on success
      if (!propDomainName) {
        setDomainName("");
      }
      setBidAmount("");
      setAdditionalEscrow("");
      setShowAdvanced(false);

    } catch (error) {
      console.error('[BidForm] Submission error:', error);
      // Error is already handled by the hook
    }
  };

  return (
    <Card className="border-2 border-electric/20 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-3xl flex items-center gap-2">
          <Lock className="w-8 h-8 text-accent" />
          Submit Encrypted Bid
        </CardTitle>
        <CardDescription className="text-base">
          Your bid amount will be encrypted using FHE before submission. Nobody can see your bid until reveal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Wallet Connection Alert */}
        {!isConnected && (
          <Alert className="mb-6 border-amber-500/20 bg-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-500">
              Please connect your wallet to submit a bid
              <div className="mt-3">
                <ConnectButton />
              </div>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Domain Name Input - only show if not provided as prop */}
          {!propDomainName && (
            <div className="space-y-2">
              <Label htmlFor="domain" className="text-lg">Domain Name</Label>
              <div className="relative">
                <Input
                  id="domain"
                  type="text"
                  placeholder="example.eth"
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  className="text-lg h-14 border-2 border-electric/30 focus:border-electric"
                  disabled={isProcessing || !isConnected}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Enter the domain you want to bid on
              </p>
            </div>
          )}

          {/* Domain display when provided as prop */}
          {propDomainName && (
            <div className="p-4 rounded-lg bg-muted/50 border-2 border-accent/20">
              <p className="text-sm text-muted-foreground mb-1">Bidding on</p>
              <p className="text-2xl font-bold text-accent">{propDomainName}</p>
            </div>
          )}

          {/* Bid Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-lg">Your Bid (ETH)</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.001"
                min="0"
                placeholder="0.00"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="text-lg h-14 border-2 border-electric/30 focus:border-electric"
                disabled={isProcessing || !isConnected}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              This amount will be encrypted and locked as escrow
            </p>
          </div>

          {/* Advanced Options Toggle */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="ghost"
              className="gap-2 text-accent hover:text-accent/80 p-0 h-auto font-normal"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Shield className="w-4 h-4" />
              {showAdvanced ? "Hide" : "Show"} Advanced Options
            </Button>

            {/* Advanced Options - Additional Escrow */}
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 p-4 rounded-lg bg-muted/30 border border-accent/20"
              >
                <div className="space-y-2">
                  <Label htmlFor="additional" className="text-base flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Additional Escrow (Optional)
                  </Label>
                  <Input
                    id="additional"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.00"
                    value={additionalEscrow}
                    onChange={(e) => setAdditionalEscrow(e.target.value)}
                    className="h-12 border-accent/30 focus:border-accent"
                    disabled={isProcessing || !isConnected}
                  />
                  <p className="text-xs text-muted-foreground">
                    Lock extra funds to show commitment (strategy: intimidate competitors)
                  </p>
                </div>

                {/* Total Escrow Display */}
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Locked</span>
                    <span className="text-lg font-bold text-accent">
                      {getTotalEscrow()} ETH
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bid: {bidAmount || "0.00"} ETH + Additional: {additionalEscrow || "0.00"} ETH
                  </p>
                </div>
              </motion.div>
            )}

            {/* Simple Total Display (when advanced is hidden) */}
            {!showAdvanced && bidAmount && (
              <div className="p-3 rounded-lg bg-muted/30 border border-accent/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount to Lock</span>
                  <span className="text-lg font-bold text-accent">{bidAmount} ETH</span>
                </div>
              </div>
            )}
          </div>

          {/* Status indicators */}
          {(isEncrypting || isSubmitting) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg bg-accent/10 border border-accent/20"
            >
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-accent" />
                <div>
                  <p className="font-medium text-accent">
                    {isEncrypting ? "Encrypting bid amount..." : "Submitting transaction..."}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isEncrypting
                      ? "Using FHE to secure your bid"
                      : "Sending encrypted data to blockchain"}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Success message */}
          {txHash && !isSubmitting && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-lg bg-green-500/10 border border-green-500/20"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div className="flex-1">
                  <p className="font-medium text-green-500">Bid Submitted Successfully!</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {txHash.slice(0, 20)}...{txHash.slice(-16)}
                  </p>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent hover:underline mt-1 inline-block"
                  >
                    View on Etherscan →
                  </a>
                </div>
              </div>
            </motion.div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full h-14 text-lg bg-primary hover:bg-primary-light"
            disabled={isProcessing || !isConnected || !domainName || !bidAmount}
          >
            {!isConnected ? (
              <>
                <Wallet className="w-5 h-5 mr-2" />
                Connect Wallet First
              </>
            ) : isEncrypting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Encrypting...
              </>
            ) : isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 mr-2" />
                Encrypt & Submit Bid
              </>
            )}
          </Button>

          {/* Info box */}
          <div className="p-4 rounded-lg bg-muted/50 border">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent" />
              How it works
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Your bid is encrypted locally using FHE technology</li>
              <li>• Encrypted data is submitted to the blockchain with escrow</li>
              <li>• No one can see your bid amount until reveal phase</li>
              <li>• Front-running is mathematically impossible</li>
              <li>• Escrow is returned if you don't win the auction</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
