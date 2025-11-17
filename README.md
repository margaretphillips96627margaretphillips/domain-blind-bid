# DomainVault - fhEVM Sealed-Bid Auctions

DomainVault is a fhEVM 0.9.x powered marketplace for encrypted domain auctions.  
Every bid is encrypted in the browser with Zama's Relayer SDK 0.3.0-5 and stored on-chain as ciphertext.  
Only the gateway (and later the seller) can decrypt the results once the auction is finalized.

## Highlights

- **Fully Homomorphic Encryption** - bids are encrypted locally and never leave the browser as plain text.  
- **Simple Auction Lifecycle** - create auction -> encrypted bids -> finalize -> share encrypted result with viewers.  
- **Seller Controls Access** - the seller decides who can decrypt the winning ciphertext after settlement.  
- **Modern Frontend Stack** - React + Vite + TypeScript, Wagmi/RainbowKit for wallet UX, Tailwind + shadcn/ui for styling.

## Live Demo

- Production: https://domainvault-fhe.vercel.app

## Architecture

### Smart Contract (`contracts/DomainVaultAuction_v2.sol`)

- `createAuction(bytes32 auctionId, string domain, uint64 durationSeconds, uint64 startingBidWei)`  
  Admin-only helper that opens an auction immediately and stores metadata (seller, timing, starting price).
- `placeBid(bytes32 auctionId, bytes32 encryptedBid, bytes proof)`  
  Imports the encrypted bid handle and proof, keeps the highest encrypted value plus encrypted winner address.
- `finalizeAuction(bytes32 auctionId)`  
  Anyone can finalize after `biddingCloses`; marks the auction as ended and grants the seller view access.
- `grantView(bytes32 auctionId, address viewer)`  
  Seller can grant additional viewers access to the encrypted highest bid / winner handles.
- `highestBid(bytes32 auctionId)` / `winner(bytes32 auctionId)`  
  Return encrypted handles. They revert unless the auction ended and the caller is authorized.

### Frontend

- **Routing** - `/` landing, `/auction` list, `/auction/:id` detail + bidding, `/submit-auction` admin create flow.  
- **Hooks** - `useDomainVault.ts` exposes create, bid, finalize, grant-view, encrypted-result helpers; `useAuctions.ts` provides read-side list/detail queries via Wagmi public client.  
- **FHE Setup** - SDK is injected globally via `<script src="https://cdn.zama.org/relayer-sdk-js/0.3.0-5/relayer-sdk-js.umd.cjs" defer>`. `src/utils/fheInstance.ts` wraps initialization and exposes a singleton.  
- **UI** - Tailwind CSS + shadcn components with toasts via `sonner`. All status/error messages are English-only to simplify QA.

## Requirements

- Node.js 20+ / npm 10+
- Sepolia wallet with test ETH and permission to create auctions
- WalletConnect Project ID (RainbowKit)
- Contract deployed on Sepolia (address injected through `.env`)

## Local Setup

```bash
git clone https://github.com/margaretphillips96627margaretphillips/domain-blind-bid.git
cd projects/10_DomainVault
npm install
```

Create `.env` (see `.env.example`) and set:

```
SEPOLIA_RPC_URL=...
SEPOLIA_DEPLOYER_KEY=...
SEPOLIA_RELAYER_KEY=...
DOMAINVAULT_GATEWAY_SIGNER=...
ETHERSCAN_API_KEY=...
VITE_WALLETCONNECT_PROJECT_ID=...
VITE_CONTRACT_ADDRESS=0x...   # address of DomainVaultAuction
VITE_SEPOLIA_CHAIN_ID=11155111
```

### Contracts

```bash
npx hardhat compile
npx hardhat run deploy/001_deploy_domainvault.ts --network sepolia
# verify if needed
npm run contracts:verify
```

### Frontend

```bash
npm run dev      # http://localhost:8080
npm run build    # production build
npm run preview  # serve build
```

## FHE Workflow

1. Wallet connects via RainbowKit.
2. `usePlaceBid` initializes FHE SDK if needed (`initializeFHE()` from `fheInstance.ts`).
3. Bid amount -> `encryptUint64` -> returns `{ handle, proof }`.
4. Transaction submits handle + proof; contract stores encrypted highest bid and encrypted winner handle.
5. After auction closes, seller finalizes; encrypted results can then be shared via `grantView`.  
6. Decryption happens through Zama's relayer/gateway after appropriate access is granted.

## Project Structure

```
contracts/                 # Solidity sources (DomainVaultAuction_v2)
deploy/                    # Hardhat deploy scripts
public/                    # Static assets (favicon, wasm blobs)
scripts/                   # Minimal deployment/verification helpers
src/
  components/              # UI pieces such as DomainBidForm
  hooks/                   # useDomainVault + useAuctions
  pages/                   # Route-level components
  utils/                   # FHE helpers, encryption utilities
  abi/                     # JSON ABI used by the frontend
```

## npm Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview the build |
| `npm run lint` | Run ESLint |
| `npx hardhat compile` | Compile contracts |
| `npx hardhat test` | Execute Hardhat tests (if re-added) |

## Security Notes

- Never commit private keys; `.env` is gitignored.  
- Bids remain encrypted until the seller finalizes the auction. Only authorized viewers can access ciphertext handles.  
- Always verify contract addresses/gateway signer before running encryption routines.

## License

MIT - see the root repository for full details.
