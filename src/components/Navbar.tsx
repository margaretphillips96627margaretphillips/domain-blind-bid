/**
 * Navbar Component - Global Navigation Bar
 *
 * Responsive navigation bar with logo, menu items, and wallet connection.
 * Features:
 * - Transparent backdrop with blur effect
 * - Project logo on the left
 * - Navigation menu items
 * - Wallet connect button on the right
 * - Mobile-responsive design
 *
 * @component
 */

import { Link, useLocation } from "react-router-dom";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Shield, Home, Gavel, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const location = useLocation();

  /**
   * Check if a nav item is active based on current path
   */
  const isActive = (path: string): boolean => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="border-b border-border/10 backdrop-blur-lg sticky top-0 z-50 bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo Section */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <Shield className="w-8 h-8 text-accent group-hover:text-electric transition-colors" />
              <div className="absolute inset-0 bg-accent/20 blur-xl group-hover:bg-electric/20 transition-colors" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold bg-gradient-to-r from-accent to-electric bg-clip-text text-transparent">
                DomainVault
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                FHE-Powered Auctions
              </p>
            </div>
          </Link>

          {/* Navigation Menu */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/">
              <Button
                variant="ghost"
                className={`gap-2 ${
                  isActive("/") && location.pathname === "/"
                    ? "text-accent bg-accent/10"
                    : "text-muted-foreground hover:text-accent"
                }`}
              >
                <Home className="w-4 h-4" />
                Home
              </Button>
            </Link>

            <Link to="/auction">
              <Button
                variant="ghost"
                className={`gap-2 ${
                  isActive("/auction")
                    ? "text-accent bg-accent/10"
                    : "text-muted-foreground hover:text-accent"
                }`}
              >
                <Gavel className="w-4 h-4" />
                Auctions
              </Button>
            </Link>

            <Link to="/submit-auction">
              <Button
                variant="ghost"
                className={`gap-2 ${
                  isActive("/submit-auction")
                    ? "text-accent bg-accent/10"
                    : "text-muted-foreground hover:text-accent"
                }`}
              >
                <Plus className="w-4 h-4" />
                List Domain
              </Button>
            </Link>
          </nav>

          {/* Wallet Connection */}
          <div className="flex items-center gap-4">
            <ConnectButton />
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex md:hidden items-center justify-around mt-4 pt-4 border-t border-border/10">
          <Link to="/">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 ${
                isActive("/") && location.pathname === "/"
                  ? "text-accent bg-accent/10"
                  : "text-muted-foreground"
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="text-xs">Home</span>
            </Button>
          </Link>

          <Link to="/auction">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 ${
                isActive("/auction")
                  ? "text-accent bg-accent/10"
                  : "text-muted-foreground"
              }`}
            >
              <Gavel className="w-4 h-4" />
              <span className="text-xs">Auctions</span>
            </Button>
          </Link>

          <Link to="/submit-auction">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 ${
                isActive("/submit-auction")
                  ? "text-accent bg-accent/10"
                  : "text-muted-foreground"
              }`}
            >
              <Plus className="w-4 h-4" />
              <span className="text-xs">List</span>
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
