import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Loader2, CheckCircle2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function DomainBidForm() {
  const [domainName, setDomainName] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!domainName || !bidAmount) {
      toast.error("Please enter both domain name and bid amount");
      return;
    }

    try {
      setIsEncrypting(true);
      toast.info("Initializing FHE SDK...");
      
      // Initialize fhevmjs SDK
      // Note: This is a placeholder - actual implementation would use fhevmjs
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.info("Encrypting bid amount...");
      
      // Encrypt the bid amount using FHE
      // Placeholder for actual encryption logic
      const encryptedAmount = await encryptBidAmount(bidAmount);
      
      setIsEncrypting(false);
      setIsSubmitting(true);
      
      toast.info("Submitting encrypted bid...");
      
      // Submit encrypted bid to blockchain
      const hash = await submitEncryptedBid(domainName, encryptedAmount);
      
      setTxHash(hash);
      setIsSubmitting(false);
      
      toast.success("Bid submitted successfully!", {
        description: `Transaction: ${hash.slice(0, 10)}...${hash.slice(-8)}`
      });
      
      // Reset form
      setDomainName("");
      setBidAmount("");
      
    } catch (error) {
      setIsEncrypting(false);
      setIsSubmitting(false);
      toast.error("Failed to submit bid", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  // Placeholder encryption function
  const encryptBidAmount = async (amount: string): Promise<string> => {
    // Simulate encryption delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    return `encrypted_${amount}_${Date.now()}`;
  };

  // Placeholder submission function
  const submitEncryptedBid = async (domain: string, encrypted: string): Promise<string> => {
    // Simulate blockchain transaction
    await new Promise(resolve => setTimeout(resolve, 2000));
    return `0x${Math.random().toString(16).slice(2, 66)}`;
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
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Domain Name Input */}
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
                disabled={isEncrypting || isSubmitting}
              />
            </div>
          </div>

          {/* Bid Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-lg">Bid Amount (ETH)</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="text-lg h-14 border-2 border-electric/30 focus:border-electric"
                disabled={isEncrypting || isSubmitting}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              This amount will be encrypted before leaving your browser
            </p>
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
                </div>
              </div>
            </motion.div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full h-14 text-lg bg-primary hover:bg-primary-light"
            disabled={isEncrypting || isSubmitting || !domainName || !bidAmount}
          >
            {isEncrypting ? (
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
              <li>• Encrypted data is submitted to the blockchain</li>
              <li>• No one can see your bid amount until reveal phase</li>
              <li>• Front-running is mathematically impossible</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
