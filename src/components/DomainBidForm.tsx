import { useState, useEffect } from "react";
import { Lock, Loader2, AlertCircle, Wallet } from "lucide-react";
import { useAccount } from 'wagmi';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { usePlaceBid } from "@/hooks/useDomainVault";
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface DomainBidFormProps {
  domainName?: string;
  auctionId: `0x${string}`;
}

export default function DomainBidForm({ domainName: propDomainName, auctionId }: DomainBidFormProps) {
  const { address, isConnected } = useAccount();
  const { placeBid, isSubmitting } = usePlaceBid();

  const [domainName, setDomainName] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [txHash, setTxHash] = useState("");

  useEffect(() => {
    if (propDomainName) {
      setDomainName(propDomainName);
    }
  }, [propDomainName]);

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
    if (isNaN(bidNum) || bidNum <= 0) {
      toast.error("Bid amount must be greater than 0");
      return;
    }

    try {
      const hash = await placeBid(auctionId, bidAmount);
      setTxHash(hash);
      if (!propDomainName) setDomainName("");
      setBidAmount("");
    } catch (error) {
      console.error('[BidForm] Submission error:', error);
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
          {!propDomainName && (
            <div className="space-y-2">
              <Label htmlFor="domain" className="text-lg">Domain Name</Label>
              <Input
                id="domain"
                type="text"
                placeholder="example.eth"
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                className="text-lg h-14 border-2 border-electric/30 focus:border-electric"
                disabled={isSubmitting || !isConnected}
              />
              <p className="text-sm text-muted-foreground">Enter the domain you want to bid on</p>
            </div>
          )}

          {propDomainName && (
            <div className="p-4 rounded-lg bg-muted/50 border-2 border-accent/20">
              <p className="text-sm text-muted-foreground mb-1">Bidding on</p>
              <p className="text-2xl font-bold text-accent">{propDomainName}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-lg">Your Bid (ETH)</Label>
            <Input
              id="amount"
              type="number"
              step="0.001"
              min="0"
              placeholder="0.00"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              className="text-lg h-14 border-2 border-electric/30 focus:border-electric"
              disabled={isSubmitting || !isConnected}
            />
            <p className="text-sm text-muted-foreground">This amount will be encrypted and submitted to the sealed auction</p>
          </div>

          {txHash && !isSubmitting && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="font-medium text-green-500">Bid Submitted</p>
              <p className="text-xs font-mono text-muted-foreground">{txHash}</p>
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline"
              >
                View on Etherscan →
              </a>
            </div>
          )}

          <Button type="submit" className="w-full h-14 text-lg bg-primary hover:bg-primary-light" disabled={isSubmitting || !isConnected || !domainName || !bidAmount}>
            {!isConnected ? (
              <>
                <Wallet className="w-5 h-5 mr-2" />
                Connect Wallet First
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
        </form>
      </CardContent>
    </Card>
  );
}
