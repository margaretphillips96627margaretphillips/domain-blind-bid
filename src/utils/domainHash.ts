/**
 * Domain Hash Utilities
 *
 * Helper functions for generating and validating domain hashes (dropId).
 * Uses keccak256 hashing to create unique identifiers for domain auctions.
 *
 * @module domainHash
 */

import { keccak256, toUtf8Bytes } from 'ethers';

/**
 * Generate a bytes32 hash for a domain name
 * This matches the dropId format used in the smart contract
 *
 * @param domainName - The domain name (e.g., "crypto.eth")
 * @returns bytes32 hash in 0x format (66 characters including 0x)
 *
 * @example
 * ```typescript
 * const dropId = generateDomainHash("crypto.eth");
 * // Returns: "0x1234567890abcdef..."
 * ```
 */
export function generateDomainHash(domainName: string): string {
  // Normalize domain name: lowercase and trim
  const normalized = domainName.toLowerCase().trim();

  // Generate keccak256 hash
  const hash = keccak256(toUtf8Bytes(normalized));

  return hash;
}

/**
 * Validate if a string is a valid bytes32 hash
 *
 * @param hash - The hash string to validate
 * @returns true if valid bytes32 format, false otherwise
 *
 * @example
 * ```typescript
 * isValidDomainHash("0x1234..."); // true
 * isValidDomainHash("123"); // false
 * ```
 */
export function isValidDomainHash(hash: string): boolean {
  // Check if it starts with 0x and is exactly 66 characters (0x + 64 hex chars)
  const bytes32Regex = /^0x[0-9a-fA-F]{64}$/;
  return bytes32Regex.test(hash);
}

/**
 * Shorten a domain hash for display
 *
 * @param hash - The full bytes32 hash
 * @param prefixLength - Number of characters to show after 0x (default: 6)
 * @param suffixLength - Number of characters to show at end (default: 4)
 * @returns Shortened hash string
 *
 * @example
 * ```typescript
 * shortenHash("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
 * // Returns: "0x123456...cdef"
 * ```
 */
export function shortenHash(
  hash: string,
  prefixLength: number = 6,
  suffixLength: number = 4
): string {
  if (!isValidDomainHash(hash)) {
    return hash;
  }

  const prefix = hash.slice(0, 2 + prefixLength); // 0x + prefix
  const suffix = hash.slice(-suffixLength);

  return `${prefix}...${suffix}`;
}

/**
 * Mock domain data with hashed IDs
 * This will be replaced with actual contract data
 */
export const MOCK_DOMAINS = [
  {
    domain: "crypto.eth",
    dropId: generateDomainHash("crypto.eth"),
  },
  {
    domain: "web3.eth",
    dropId: generateDomainHash("web3.eth"),
  },
  {
    domain: "defi.eth",
    dropId: generateDomainHash("defi.eth"),
  },
];

/**
 * Get domain name from mock data by hash
 *
 * @param dropId - The bytes32 domain hash
 * @returns Domain name or undefined if not found
 */
export function getDomainByHash(dropId: string): string | undefined {
  const domain = MOCK_DOMAINS.find(d => d.dropId === dropId);
  return domain?.domain;
}
