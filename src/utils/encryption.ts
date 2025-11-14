/**
 * FHE Encryption Utilities
 *
 * Helper functions for encrypting sensitive data before blockchain submission.
 * Follows Zama fhEVM best practices for FHE parameter handling.
 *
 * Key Features:
 * - uint64 encryption with zero-knowledge proof generation
 * - Batch encryption support for multiple values
 * - Address checksum validation for security
 * - Salt generation for bid uniqueness
 * - ETH/Wei conversion utilities
 *
 * Workflow:
 * 1. Get/initialize FHE instance
 * 2. Convert addresses to checksum format
 * 3. Create encrypted input (contract + user address)
 * 4. Add values to encrypt
 * 5. Generate handles and proofs
 * 6. Return hex-encoded data for contract submission
 *
 * @module encryption
 */

import { getAddress, hexlify } from 'ethers';
import { initializeFHE } from './fheInstance';

/**
 * Encrypted input result structure
 */
export interface EncryptedInput {
  handle: string;  // Hex-encoded encrypted handle
  proof: string;   // Hex-encoded zero-knowledge proof
}

/**
 * Encrypt a uint64 value for contract submission
 *
 * @param value - The value to encrypt (number or bigint)
 * @param contractAddress - Target contract address
 * @param userAddress - User's wallet address
 * @returns Promise<EncryptedInput> Encrypted handle and proof
 * @throws Error if encryption fails
 */
export async function encryptUint64(
  value: number | bigint,
  contractAddress: string,
  userAddress: string
): Promise<EncryptedInput> {
  try {
    console.log('[Encryption] Starting uint64 encryption...');
    console.log('[Encryption] Value:', value);
    console.log('[Encryption] Value type:', typeof value);
    console.log('[Encryption] Contract:', contractAddress);
    console.log('[Encryption] User:', userAddress);

    // Get or initialize FHE instance
    const fhe = await initializeFHE();

    // Log FHE instance configuration
    console.log('[Encryption] FHE instance config:', {
      hasInstance: !!fhe,
      type: typeof fhe,
    });

    // Convert addresses to checksum format (required by SDK)
    const contractAddr = getAddress(contractAddress) as `0x${string}`;
    const userAddr = getAddress(userAddress) as `0x${string}`;

    console.log('[Encryption] Creating encrypted input...');

    // Create encrypted input for the contract and user
    const input = fhe.createEncryptedInput(contractAddr, userAddr);

    // Add uint64 value
    // IMPORTANT: Must use BigInt for uint64
    input.add64(BigInt(value));

    console.log('[Encryption] Encrypting data...');

    // Encrypt and generate proof
    const { handles, inputProof } = await input.encrypt();

    console.log('[Encryption] Encryption successful');
    console.log('[Encryption] Handle length:', handles[0].length);
    console.log('[Encryption] Proof length:', inputProof.length);

    // Convert to hex format for contract submission
    return {
      handle: hexlify(handles[0]),
      proof: hexlify(inputProof)
    };
  } catch (error) {
    console.error('[Encryption] Failed to encrypt uint64:', error);
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Encrypt multiple uint64 values in a single operation
 *
 * @param values - Array of values to encrypt
 * @param contractAddress - Target contract address
 * @param userAddress - User's wallet address
 * @returns Promise<EncryptedInput[]> Array of encrypted handles and proofs
 */
export async function encryptMultipleUint64(
  values: (number | bigint)[],
  contractAddress: string,
  userAddress: string
): Promise<EncryptedInput[]> {
  try {
    console.log('[Encryption] Starting batch encryption for', values.length, 'values');

    const fhe = await initializeFHE();
    const contractAddr = getAddress(contractAddress) as `0x${string}`;
    const userAddr = getAddress(userAddress) as `0x${string}`;

    const input = fhe.createEncryptedInput(contractAddr, userAddr);

    // Add all values
    values.forEach((value, index) => {
      console.log(`[Encryption] Adding value ${index + 1}/${values.length}:`, value);
      input.add64(BigInt(value));
    });

    console.log('[Encryption] Encrypting batch...');
    const { handles, inputProof } = await input.encrypt();

    console.log('[Encryption] Batch encryption successful');

    // Map handles to individual encrypted inputs
    return handles.map((handle: Uint8Array, index: number) => ({
      handle: hexlify(handle),
      proof: hexlify(inputProof) // Same proof for all values in batch
    }));
  } catch (error) {
    console.error('[Encryption] Failed to encrypt batch:', error);
    throw new Error(`Batch encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a salt commitment for bid uniqueness
 *
 * @param salt - Random salt string
 * @returns string Keccak256 hash of the salt
 */
export function generateSaltCommitment(salt: string): string {
  // Use ethers keccak256 for salt hashing
  const { keccak256, toUtf8Bytes } = require('ethers');
  return keccak256(toUtf8Bytes(salt));
}

/**
 * Generate a random salt for bid submission
 *
 * @returns string Random hex string
 */
export function generateRandomSalt(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validate bid amount before encryption
 *
 * @param amount - Bid amount in ETH
 * @throws Error if amount is invalid
 */
export function validateBidAmount(amount: string | number): void {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    throw new Error('Bid amount must be a valid number');
  }

  if (numAmount <= 0) {
    throw new Error('Bid amount must be greater than 0');
  }

  if (numAmount > Number.MAX_SAFE_INTEGER) {
    throw new Error('Bid amount exceeds maximum safe integer');
  }
}

/**
 * Convert ETH amount to Wei for encryption
 *
 * @param ethAmount - Amount in ETH
 * @returns bigint Amount in Wei
 */
export function ethToWei(ethAmount: string | number): bigint {
  const { parseEther } = require('ethers');
  return parseEther(ethAmount.toString());
}

/**
 * Convert Wei to ETH for display
 *
 * @param weiAmount - Amount in Wei
 * @returns string Amount in ETH
 */
export function weiToEth(weiAmount: bigint | string): string {
  const { formatEther } = require('ethers');
  return formatEther(weiAmount);
}
