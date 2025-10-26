import { motion } from "framer-motion";
import { ArrowLeft, Shield, Clock, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DomainBidForm from "@/components/DomainBidForm";

export default function DApp() {
  return (
    <div className="min-h-screen gradient-dark">
      {/* Header */}
      <header className="border-b border-border/10 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/">
              <Button variant="ghost" className="gap-2 text-accent hover:text-accent/80">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            </Link>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-accent to-electric bg-clip-text text-transparent">
              DomainVault DApp
            </h1>
            <Button className="bg-accent hover:bg-accent/90 text-background">
              Connect Wallet
            </Button>
          </div>
        </div>
      </header>

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
                  <p className="text-sm text-muted-foreground">Avg. Reveal Time</p>
                  <p className="text-3xl font-bold text-foreground">24h</p>
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
                  <p className="text-sm text-muted-foreground">Total Volume</p>
                  <p className="text-3xl font-bold text-foreground">1,234 ETH</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Bid Form - Main Area */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <DomainBidForm />
          </motion.div>

          {/* Sidebar - Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-6"
          >
            {/* How FHE Works */}
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

            {/* Your Recent Bids */}
            <Card className="border-accent/20 bg-surface/30 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl">Your Recent Bids</CardTitle>
                <CardDescription>
                  Track your submitted auctions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">example.eth</span>
                      <span className="text-xs px-2 py-1 rounded bg-accent/20 text-accent">
                        Pending
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Submitted 2h ago</p>
                  </div>

                  <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">crypto.eth</span>
                      <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary">
                        Revealed
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Submitted 1d ago</p>
                  </div>

                  <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">web3.eth</span>
                      <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-500">
                        Won
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Submitted 3d ago</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
