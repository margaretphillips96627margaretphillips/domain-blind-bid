# DomainVault - Encrypted Domain Blind Auction


## Vision
DomainVault lets users compete for premium ENS-style domain names without revealing their bids.
Sealed offers stay encrypted until the time lock expires and the winning bid is revealed through the
gateway, preventing frontrunning and squatting by concealing both bid size and bidder identity.


## Market Fit & Sustainability
- ENS and domain registrars hosting premium drops that must hide price signals.
- Web3 naming DAOs distributing scarce subdomains fairly.
- Brand protection agencies running private auctions for strategic names.


## FHE-First Architecture
- Bids stored as `euint64` ciphertexts and compared via `TFHE.max` for sealed winner selection.
- Encrypted reserve and anti-sniping extensions executed without exposing thresholds.
- Gateway reveal discloses only the winning bidder and final amount with verifiable proofs.


## Token & Revenue Model
- Charge listing fee plus success commission on each closed auction.
- Offer registrar analytics packages with anonymised bidding trends.
- White-label auction workflow for corporate naming desks.


## Contract Modules
- **NameDropRegistry** — Registers domain lots, encrypted reserves, and auction windows for each release. Reserves stored as ciphertext; `TFHE.gt` ensures bids must surpass hidden thresholds before acceptance.
  - Functions: `createDrop`, `updateReserve`, `cancelDrop`
- **BlindBidVault** — Collects encrypted bids with hashed salt commitments and optional proof of funds. Uses `TFHE.max` to maintain leading bid and `TFHE.eq` to block duplicate salts.
  - Functions: `submitBid`, `escalateBid`, `finaliseEnvelope`
- **DomainSettlement** — Handles reveal requests, transfers name tokens, and coordinates payout splitting. Gateway decrypt returns winner + price; contract completes registrar transfer and revenue share.
  - Functions: `requestReveal`, `recordReveal`, `releaseFunds`


## Frontend Experience
- **Theme**: Teal Registrar • Primary #0F766E • Accent #2DD4BF
- **Font Pairing**: General Sans + IBM Plex Serif
- **Realtime UX**: Pusher channels push bid count deltas and reveal completion notices to bidders and curators.


## Deployment & Operations
- Deploy `DomainVaultAuction.sol` with registrar multisig controlling allowlist and drop creation.
- Configure Cloud scheduler to send allowlist approvals and bidding reminders.
- Frontend deploy on Vercel using ISR for drop pages while websockets keep stats fresh.


## Roadmap
- Introduce Dutch auction fallback if sealed reserve not hit.
- Add enterprise SSO for brand managers overseeing multiple auction desks.
- Bundle domain escrow insurance product via partner underwriters.


## Partnership Targets
- ENS and DNS registrars launching premium name programs.
- Brand management agencies securing strategic names.
- Law firms handling trademark-sensitive domain transfers.
