# DomainVault Frontend Development Guide

        ## Identity & Theme
        - **Design Language**: Teal Registrar — primary #0F766E, secondary #0B1120, accent #2DD4BF, surface #134E4A, background #021012.
        - **Gradient Token**: linear-gradient(135deg, #0F766E 0%, #0E7490 100%)
        - **Font Pairing**: General Sans + IBM Plex Serif

        ## Core Pages & Flows
        ### Route `/` — Premium Drop Landing
                **Purpose**: Showcase upcoming domain releases, highlight registrar partners, and onboard bidders.
                - Hero animation with rotating nameplates and encrypted activity ticker.
- Release timeline section featuring allowlist, bidding, reveal, and claim phases.
- CTA cluster with connect wallet, join allowlist, and read rules.

### Route `/drop/[slug]` — Bidding Console
                **Purpose**: Provide lot details, encrypted bid analytics, and submission workflow for each domain.
                - Lot metadata card with ENS label, DNS hints, and partner statements.
- Encrypted heatmap showing bid count without exposing prices.
- Bid wizard guiding deposit verification, encryption, and receipt download.

### Route `/curator` — Registrar Backoffice
                **Purpose**: Registrar staff manage drops, monitor reveals, and export compliance logs.
                - Drop management table with filters for status, volume, and reveal progress.
- Reveal queue with signature status and retry controls.
- Export drawer generating CSV and PDF proofs for regulators.

        ## Signature Components
        - **NamePlateCarousel** — Animated card stack highlighting featured domains with encrypted stats.
- **BidWizard** — Three-step wizard for escrow verification, ciphertext creation, and submission.
- **RevealMonitor** — Dashboard widget tracking reveal progress, gateway signatures, and payout states.

        ## State & Data
        - React Query fetches drop data; Zustand manages bid wizard state; EventSource stream updates reveal status.
        - Smart contract data hydrated via wagmi `readContract` hooks with suspense wrappers.
        - Encryption context stored in React Context to avoid re-initialising the SDK per component.

        ## Encryption Workflow
        Initialise SDK, encrypt bid as `euint64`, attach hashed salt + proof-of-funds token, send transaction via wagmi action.

        ## Realtime & Telemetry
        - Pusher channels push bid count deltas and reveal completion notices to bidders and curators.
        - Analytics via PostHog tracking conversion funnels and retention cohorts.
        - Error logging with Sentry capturing encryption or gateway issues.

        ## Testing & Quality
        - Playwright verifies bid encryption flow with success and failure states.
        - Unit tests ensure reveal monitor handles multi-lot updates gracefully.
        - Percy snapshots maintain registrar branding consistency across locales.
