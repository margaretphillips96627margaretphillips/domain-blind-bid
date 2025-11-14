/**
 * DomainVault UI E2E Tests
 * Automated tests that don't require wallet interaction
 */

import { test, expect } from '@playwright/test';

test.describe('DomainVault - Auction UI Tests', function() {
  test.beforeEach(async function({ page }) {
    await page.goto('/auction');
    await page.waitForLoadState('networkidle');
  });

  test('should display the auction interface correctly', async function({ page }) {
    await expect(page.getByText('Domain Auction')).toBeVisible();
    await expect(page.getByText('Submit Encrypted Bid')).toBeVisible();
    await expect(page.getByText('About FHE Encryption')).toBeVisible();
  });

  test('should show form fields', async function({ page }) {
    await expect(page.getByPlaceholder('example.eth')).toBeVisible();
    await expect(page.getByPlaceholder('0.00')).toHaveCount(2);
  });

  test('should display stats cards', async function({ page }) {
    await expect(page.getByText('Active Auctions')).toBeVisible();
    await expect(page.getByText('Avg. Reveal Time')).toBeVisible();
    await expect(page.getByText('Total Volume')).toBeVisible();
  });

  test('should show FHE explanation section', async function({ page }) {
    await expect(page.getByText('Local Encryption').first()).toBeVisible();
    await expect(page.getByText('Sealed Submission')).toBeVisible();
    await expect(page.getByText('Reveal Phase', { exact: true })).toBeVisible();
  });

  test('should have back to home button', async function({ page }) {
    const backButton = page.getByRole('button', { name: /Back to Home/ });
    await expect(backButton).toBeVisible();
  });

  test('should show responsive design', async function({ page }) {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByText('Submit Encrypted Bid')).toBeVisible();
  });
});

test.describe('DomainVault - Landing Page', function() {
  test('should display landing page', async function({ page }) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/');
  });

  test('should navigate to auction page', async function({ page }) {
    await page.goto('/');
    const startBiddingBtn = page.getByRole('link', { name: /Start Bidding/i });
    if (await startBiddingBtn.isVisible()) {
      await startBiddingBtn.click();
      await expect(page).toHaveURL('/auction');
    }
  });
});

test.describe('DomainVault - Error Handling', function() {
  test('should handle 404 pages', async function({ page }) {
    await page.goto('/non-existent-page');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  });
});
