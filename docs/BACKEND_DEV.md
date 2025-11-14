# DomainVault Backend Development Guide

        ## Contract System
        ### NameDropRegistry
Registers domain lots, encrypted reserves, and auction windows for each release.

- **FHE Logic**: Reserves stored as ciphertext; `TFHE.gt` ensures bids must surpass hidden thresholds before acceptance.
- **Key Functions**: `createDrop`, `updateReserve`, `cancelDrop`

### BlindBidVault
Collects encrypted bids with hashed salt commitments and optional proof of funds.

- **FHE Logic**: Uses `TFHE.max` to maintain leading bid and `TFHE.eq` to block duplicate salts.
- **Key Functions**: `submitBid`, `escalateBid`, `finaliseEnvelope`

### DomainSettlement
Handles reveal requests, transfers name tokens, and coordinates payout splitting.

- **FHE Logic**: Gateway decrypt returns winner + price; contract completes registrar transfer and revenue share.
- **Key Functions**: `requestReveal`, `recordReveal`, `releaseFunds`

        ## Storage Layout
        - `mapping(bytes32 => DropConfig)` storing encrypted reserves and scheduling controls.
- `mapping(bytes32 => mapping(address => DomainBid))` capturing ciphertext, salt hash, and deposit data.
- `mapping(bytes32 => SettlementInfo)` caching encrypted revenue splits until reveal clears.

        ## Gateway & Relayer Coordination
        - Registrar gateway service signs reveal payload and includes registrar attestation hash.
- Timeout watcher triggers re-request if reveal response not returned within SLA.
- Audit log exported to registrars for compliance without leaking losing bids.

        ## Offchain Services
        - Drop storytelling CMS powering hero assets and lot descriptions.
- Registrar API sync ensuring successful bidders auto-provision subdomains or records.
- Notification microservice sending allowlist approvals and reveal certificates.

        ## Testing Strategy
        - Hardhat tests covering reserve enforcement, bid escalation, and settlement distribution.
- Invariant tests ensuring losing bids can never be decrypted or leaked.
- Gateway mock verifying registrar attestation required before transfer.

        ## Deployment Playbook
        - Deploy `DomainVaultAuction.sol` with registrar multisig controlling allowlist and drop creation.
- Configure Cloud scheduler to send allowlist approvals and bidding reminders.
- Frontend deploy on Vercel using ISR for drop pages while websockets keep stats fresh.
