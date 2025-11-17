# DomainVault - FHE-Powered Domain Auction

A decentralized domain auction platform using Fully Homomorphic Encryption (FHE) to enable blind bidding. Built with Zama's fhEVM technology, ensuring bid amounts remain private until the reveal phase.

## 🎯 Project Overview

DomainVault implements an encrypted blind auction system for premium domain names, leveraging FHE to protect bidders from front-running and ensure fairness. The platform allows:

- **Encrypted Bid Submission**: Bid amounts are encrypted locally before submission
- **Privacy-Preserving Auctions**: No one can see bid amounts until reveal
- **Escrow Management**: Automatic handling of deposits and refunds
- **Fair Reveal Process**: Trustless winner determination via gateway decryption

## 🏗️ Architecture

### Smart Contract

- **DomainVaultAuction.sol**: Main auction contract with FHE operations
  - Drop creation with encrypted reserves
  - Encrypted bid submission with escrow
  - Bid escalation functionality
  - Gateway-based reveal mechanism
  - Escrow release and reclaim

### Frontend DApp

- **Framework**: Vite + React + TypeScript
- **Web3 Integration**: Wagmi + RainbowKit (Coinbase connector disabled)
- **FHE SDK**: @zama-fhe/relayer-sdk@0.2.0 (CDN dynamic import)
- **UI Components**: shadcn/ui with custom theme
- **Styling**: Tailwind CSS with FHE-focused design

## 📋 Prerequisites

- Node.js v20.11.1+ and npm
- MetaMask or compatible Web3 wallet
- Sepolia testnet ETH for transactions
- WalletConnect Project ID (for RainbowKit)

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd projects/10_DomainVault

# Install dependencies
npm install
```

### 2. Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Configure the following variables:

```env
# Blockchain Configuration
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
SEPOLIA_DEPLOYER_KEY=your_private_key_without_0x
SEPOLIA_RELAYER_KEY=your_relayer_private_key_without_0x

# Contract Configuration
DOMAINVAULT_GATEWAY_SIGNER=0x_gateway_signer_address
ETHERSCAN_API_KEY=your_etherscan_api_key

# Frontend Configuration
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
VITE_CONTRACT_ADDRESS=deployed_contract_address_after_deployment
VITE_SEPOLIA_CHAIN_ID=11155111
```

### 3. Smart Contract Deployment

```bash
# Compile contracts
npx hardhat compile

# Deploy to Sepolia
npm run contracts:deploy:sepolia

# The deployment script will:
# - Deploy DomainVaultAuction contract
# - Export ABI to src/abi/
# - Save deployment info to deployments/
# - Verify contract on Etherscan (if API key provided)
```

### 4. Frontend Development

```bash
# Start development server
npm run dev

# The app will be available at:
# http://localhost:8080
```

### 5. Build for Production

```bash
# Build frontend
npm run build

# Preview production build
npm run preview
```

## 🔐 FHE Implementation Details

### SDK Initialization

DomainVault uses CDN dynamic import for FHE SDK (recommended for Vite projects):

```typescript
// src/utils/fheInstance.ts
const sdk = await import('https://cdn.zama.ai/relayer-sdk-js/0.2.0/relayer-sdk-js.js');
const { initSDK, createInstance, SepoliaConfig } = sdk;

await initSDK();  // Initialize WASM
const fhe = await createInstance(SepoliaConfig);  // Create instance with Sepolia config
```

### Encryption Workflow

1. **User Input**: Bidder enters domain name and bid amount
2. **Local Encryption**: FHE SDK encrypts the bid amount in the browser
3. **Generate Proof**: Zero-knowledge proof is created for the encrypted value
4. **Submit Transaction**: Encrypted handle + proof + escrow sent to contract
5. **Contract Verification**: Contract verifies proof and imports encrypted value
6. **ACL Authorization**: `FHE.allowThis()` grants contract access to encrypted data

### Contract Security

The smart contract follows fail-closed security principles:

- All FHE operations explicitly authorize access via ACL
- Invalid inputs cause transaction reversion
- Escrow is protected from unauthorized release
- Duplicate salt commitments are blocked
- Only gateway can record reveal results

## 📁 Project Structure

```
10_DomainVault/
├── contracts/
│   └── DomainVaultAuction.sol    # Main auction contract with FHE
├── scripts/
│   └── deploy-sepolia.cjs        # Deployment script
├── src/
│   ├── components/
│   │   └── DomainBidForm.tsx     # Encrypted bid submission form
│   ├── config/
│   │   └── wagmi.ts              # Wagmi & RainbowKit configuration
│   ├── hooks/
│   │   └── useDomainVault.ts     # Contract interaction hooks
│   ├── pages/
│   │   ├── Index.tsx             # Landing page
│   │   └── DApp.tsx              # Main DApp interface
│   ├── providers/
│   │   └── FheProvider.tsx       # FHE context provider
│   ├── utils/
│   │   ├── fheInstance.ts        # FHE SDK instance management
│   │   └── encryption.ts         # Encryption helper functions
│   └── App.tsx                   # Root component with providers
├── hardhat.config.cjs            # Hardhat configuration
├── vite.config.ts                # Vite config with COOP/COEP headers
├── package.json                  # Dependencies and scripts
└── README.md                     # This file
```

## 🔧 Key Features

### Frontend Features

- **Wallet Integration**: RainbowKit with MetaMask, WalletConnect (Coinbase disabled)
- **FHE Encryption**: Lazy-loaded SDK with automatic initialization
- **Real-time Feedback**: Loading states for encryption and submission
- **Transaction Tracking**: Etherscan links for all transactions
- **Responsive UI**: Mobile-friendly design with Tailwind CSS
- **Error Handling**: User-friendly error messages and recovery

### Smart Contract Features

- **Encrypted Bids**: euint64 for bid amounts (supports large ETH values)
- **Salt Commitments**: Prevents duplicate bid submissions
- **Escrow Management**: Automatic deposit handling and refunds
- **Bid Escalation**: Update existing bids with new encrypted values
- **Gateway Reveal**: Off-chain decryption with on-chain verification
- **Access Control**: Fine-grained ACL for encrypted data

## 📖 Usage Guide

### For Bidders

1. **Connect Wallet**: Click "Connect Wallet" in the DApp header
2. **Navigate to DApp**: Go to `/dapp` route
3. **Enter Domain**: Input the domain name you want to bid on
4. **Set Bid Amount**: Enter your bid in ETH (will be encrypted)
5. **Set Escrow**: Provide collateral (must be ≥ bid amount)
6. **Submit Bid**: Click "Encrypt & Submit Bid" - the app will:
   - Initialize FHE SDK if needed
   - Encrypt your bid amount locally
   - Generate zero-knowledge proof
   - Submit transaction with escrow
7. **Wait for Confirmation**: Transaction hash will be shown
8. **Track Bid**: View your bid status in the sidebar

### For Administrators

1. **Create Drop**: Call `createDrop()` with encrypted reserve
2. **Monitor Auction**: Track bid count without seeing amounts
3. **Request Reveal**: Call `requestReveal()` after bidding closes
4. **Release Funds**: Call `releaseEscrow()` to pay winner

### For Losers

1. **Wait for Reveal**: Auction must be revealed or canceled
2. **Reclaim Escrow**: Call `reclaimEscrow()` to get deposit back

## 🛠️ Development

### Run Tests

```bash
# Compile contracts
npx hardhat compile

# Run contract tests
npx hardhat test

# Run with coverage
npx hardhat coverage
```

### Lint and Format

```bash
# Lint frontend code
npm run lint

# Type check
npx tsc --noEmit
```

### Local Hardhat Node

```bash
# Start local node
npx hardhat node

# Deploy to local node (in another terminal)
npx hardhat run scripts/deploy-sepolia.cjs --network localhost
```

## 🌐 Deployment

### Smart Contract

```bash
# Ensure .env is configured
npm run contracts:deploy:sepolia
```

### Frontend (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Or use GitHub integration for automatic deployment
```

### Environment Variables for Vercel

Add these in Vercel project settings:

- `VITE_CONTRACT_ADDRESS`: Deployed contract address
- `VITE_WALLETCONNECT_PROJECT_ID`: WalletConnect project ID
- `VITE_SEPOLIA_CHAIN_ID`: 11155111

## 📚 Technical Stack

### Smart Contract

- **Solidity**: ^0.8.24
- **FHE Library**: @fhevm/solidity@^0.8.0
- **OpenZeppelin**: ^5.1.0 (ReentrancyGuard)
- **Hardhat**: ^2.22.0
- **TypeChain**: ^8.3.1

### Frontend

- **React**: ^18.3.1
- **TypeScript**: ^5.8.3
- **Vite**: ^5.4.19
- **Wagmi**: ^2.13.5
- **RainbowKit**: ^2.2.9
- **Ethers**: ^6.13.0
- **FHE SDK**: @zama-fhe/relayer-sdk@0.2.0
- **Tailwind CSS**: ^3.4.17
- **shadcn/ui**: Latest

## 🔗 Important Links

- **Sepolia Etherscan**: https://sepolia.etherscan.io
- **Zama Documentation**: https://docs.zama.ai/fhevm
- **RainbowKit Docs**: https://www.rainbowkit.com
- **Wagmi Docs**: https://wagmi.sh

## ⚠️ Security Considerations

### FHE-Specific

- Never override `SepoliaConfig.network` - breaks KMS decryption
- Always call `FHE.allowThis()` after `FHE.fromExternal()`
- Use checksum addresses for all encryption operations
- Validate all inputs before encryption

### Smart Contract

- ReentrancyGuard on all payable functions
- Fail-closed defaults (revert on invalid states)
- Salt commitments prevent duplicate bids
- Gateway-only access for reveal operations

### Frontend

- Client-side encryption prevents data leaks
- COOP/COEP headers enable SharedArrayBuffer
- Transaction confirmations before state updates
- Clear error messages for user guidance

## 🐛 Troubleshooting

### FHE SDK Issues

**Problem**: `Error: WASM not initialized`
- **Solution**: Ensure `initSDK()` is called before `createInstance()`

**Problem**: `TypeError: fhe.createEncryptedInput is not a function`
- **Solution**: Check CDN URL and SDK version (must be 0.2.0)

**Problem**: `Error: could not decode result data`
- **Solution**: Don't override `SepoliaConfig.network` property

### Contract Issues

**Problem**: `DomainVault__DuplicateSalt`
- **Solution**: Each bid needs a unique salt commitment

**Problem**: `DomainVault__AuctionClosed`
- **Solution**: Check bidding window (between biddingOpens and biddingCloses)

**Problem**: `DomainVault__EscrowMissing`
- **Solution**: Include ETH value with transaction (≥ bid amount)

### Wallet Issues

**Problem**: Transaction fails with "insufficient funds"
- **Solution**: Ensure wallet has enough Sepolia ETH

**Problem**: Coinbase Wallet connection fails
- **Solution**: Coinbase connector is intentionally disabled - use MetaMask or WalletConnect

## 📄 License

MIT License - see LICENSE file for details

## 👥 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

## 🙏 Acknowledgments

- **Zama**: For the FHE technology and fhEVM platform
- **RainbowKit**: For excellent wallet connection UI
- **Wagmi**: For Web3 React hooks
- **shadcn/ui**: For beautiful UI components
- **Vercel**: For hosting and deployment

## 📞 Support

For issues and questions:

- **GitHub Issues**: [Project Issues](https://github.com/your-repo/issues)
- **Zama Discord**: https://discord.gg/fhe-org
- **Documentation**: See `/docs` folder for detailed guides

---

**Built with ❤️ using Zama FHE Technology**
