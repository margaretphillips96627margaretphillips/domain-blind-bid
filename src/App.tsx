/**
 * DomainVault Application Root Component
 *
 * Main application entry point that sets up the provider hierarchy:
 * 1. WagmiProvider - Web3 wallet and network management
 * 2. QueryClientProvider - React Query for async state management
 * 3. RainbowKitProvider - Wallet connection UI (Coinbase disabled)
 * 4. FheProvider - FHE SDK initialization and management
 * 5. TooltipProvider - UI tooltip support
 *
 * Route Structure:
 * - / : Landing page with project introduction
 * - /auction : Auction list page (browse all auctions)
 * - /auction/:id : Individual auction detail and bidding page
 * - /submit-auction : Create new auction listing
 * - /dapp : Legacy redirect to auction list
 * - * : 404 Not Found page
 *
 * @component
 */

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { FheProvider } from '@/providers/FheProvider';
import { wagmiConfig } from '@/config/wagmi';
import Index from "./pages/Index";
import AuctionList from "./pages/AuctionList";
import AuctionDetail from "./pages/AuctionDetail";
import SubmitAuction from "./pages/SubmitAuction";
import NotFound from "./pages/NotFound";

// Import RainbowKit styles
import '@rainbow-me/rainbowkit/styles.css';

// Initialize React Query client with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * App Component
 * Renders the application with all necessary providers
 */
const App = () => (
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider theme={darkTheme({
        accentColor: '#0F766E',
        accentColorForeground: 'white',
        borderRadius: 'medium',
      })}>
        <FheProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Landing page */}
                <Route path="/" element={<Index />} />

                {/* Auction routes */}
                <Route path="/auction" element={<AuctionList />} />
                <Route path="/auction/:id" element={<AuctionDetail />} />
                <Route path="/submit-auction" element={<SubmitAuction />} />

                {/* Legacy route redirect for backward compatibility */}
                <Route path="/dapp" element={<AuctionList />} />

                {/* Catch-all route for 404 pages */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </FheProvider>
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

export default App;
