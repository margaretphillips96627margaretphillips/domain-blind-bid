# DomainVault E2E Testing Guide

## Overview

This directory contains end-to-end tests for the DomainVault DApp using Playwright.

## Test Structure

- `domain-bid.spec.ts` - Main bid submission flow tests
- Tests cover UI, wallet connection, FHE encryption, and transaction submission

## Running Tests

### Prerequisites

1. **Install Playwright**
   ```bash
   npm install -D @playwright/test
   npx playwright install chromium
   ```

2. **Environment Setup**
   - Contract must be deployed
   - `VITE_CONTRACT_ADDRESS` set in `.env`
   - Dev server ready to start

3. **For Manual Tests (wallet interaction)**
   - MetaMask browser extension installed
   - Test wallet with Sepolia ETH

### Run All Tests

```bash
# Run all tests (headless)
npx playwright test

# Run with UI mode
npx playwright test --ui

# Run specific test file
npx playwright test e2e/domain-bid.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run only automated tests (skip manual ones)
npx playwright test --grep-invert MANUAL
```

### Generate Test Report

```bash
npx playwright show-report
```

## Test Categories

### Automated Tests (No Wallet Required)
- ✅ Page layout and UI elements
- ✅ Form validation
- ✅ Responsive design
- ✅ Navigation
- ✅ Error states

### Manual Tests (Wallet Required)
- ⏭️ Wallet connection (marked with `test.skip`)
- ⏭️ Bid submission with encryption
- ⏭️ Transaction confirmation
- ⏭️ Success state display

## Using Playwright-Zama MCP

To use the Playwright-Zama MCP for automated wallet testing:

### Setup

1. **Install MCP Server**
   ```bash
   npm install -g @playwright/zama-mcp
   ```

2. **Configure MCP**
   Edit `.mcp.json` in project root:
   ```json
   {
     "mcpServers": {
       "playwright-zama": {
         "command": "npx",
         "args": ["playwright-zama-mcp"]
       }
     }
   }
   ```

3. **Create Automated Wallet Test**
   ```typescript
   import { test, expect } from '@playwright/test';
   import { setupMetaMask, connectWallet } from 'playwright-zama';

   test('automated wallet test', async ({ page, context }) => {
     // Setup MetaMask
     await setupMetaMask(context, {
       seed: process.env.TEST_SEED_PHRASE,
       password: 'Test1234!',
       network: 'sepolia'
     });

     await page.goto('/dapp');

     // Connect wallet automatically
     await connectWallet(page);

     // Continue with bid submission...
   });
   ```

## Test Coverage

### UI Tests
- [x] Landing page display
- [x] DApp page layout
- [x] Form fields rendering
- [x] Stats cards display
- [x] FHE explanation section
- [x] Responsive design (mobile/desktop)
- [x] Navigation flows

### Validation Tests
- [x] Empty form submission
- [x] Required fields check
- [x] Bid amount validation
- [x] Escrow >= bid validation
- [x] Domain name format

### Integration Tests (Manual)
- [ ] Wallet connection flow
- [ ] Network detection
- [ ] FHE SDK initialization
- [ ] Bid encryption process
- [ ] Transaction submission
- [ ] MetaMask confirmation
- [ ] Success state with tx hash
- [ ] Etherscan link verification

## Debugging

### View Test in Browser
```bash
npx playwright test --headed --debug
```

### Generate Trace
```bash
npx playwright test --trace on
npx playwright show-trace trace.zip
```

### Screenshots on Failure
Automatically saved to `test-results/` directory

## CI/CD Integration

For GitHub Actions:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps chromium

- name: Run E2E tests
  run: npx playwright test --grep-invert MANUAL

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Known Limitations

1. **MetaMask Automation**: Manual tests require user interaction unless using playwright-zama MCP
2. **Network Delays**: Blockchain transactions may take 15-30 seconds
3. **Flaky Tests**: Transaction confirmations can timeout on slow networks

## Best Practices

1. Use `test.skip` for tests requiring manual wallet interaction
2. Set appropriate timeouts for blockchain operations (60-90s)
3. Always wait for `networkidle` before interacting with FHE SDK
4. Check for loading states before assertions
5. Use data-testid attributes for stable selectors

## Troubleshooting

### Test Timeout
- Increase timeout in `playwright.config.ts`
- Check if dev server is running
- Verify network connectivity

### FHE SDK Errors
- Ensure COOP/COEP headers are set in vite.config.ts
- Clear browser cache
- Check browser console for errors

### Wallet Connection Fails
- Verify MetaMask is installed
- Check if wallet is unlocked
- Ensure correct network (Sepolia)

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Testing Web3 DApps](https://docs.metamask.io/wallet/how-to/test-dapps/)
