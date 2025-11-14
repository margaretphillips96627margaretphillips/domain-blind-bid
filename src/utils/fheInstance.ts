/**
 * FHE SDK Instance Management
 *
 * Singleton pattern implementation for FHE SDK initialization and management.
 * Uses CDN dynamic import to avoid Vite module resolution errors.
 *
 * Architecture:
 * - CDN-based SDK loading (recommended for Vite projects)
 * - Singleton instance with promise-based initialization guard
 * - SepoliaConfig for testnet deployment
 * - WASM initialization before instance creation
 *
 * IMPORTANT: Never override SepoliaConfig.network - breaks KMS decryption
 *
 * @see https://docs.zama.ai/fhevm
 * @module fheInstance
 */

let fheInstance: any = null;
let initPromise: Promise<any> | null = null;

/**
 * Initialize FHE SDK using CDN dynamic import
 * This is the recommended approach for Vite projects to avoid module resolution errors
 *
 * @returns Promise<FheInstance> Initialized FHE instance
 * @throws Error if SDK initialization fails
 */
export async function initializeFHE(): Promise<any> {
  // Return existing instance if already initialized
  if (fheInstance) {
    console.log('[FHE] Using existing instance');
    return fheInstance;
  }

  // Return pending initialization if in progress
  if (initPromise) {
    console.log('[FHE] Waiting for pending initialization');
    return initPromise;
  }

  console.log('[FHE] Starting SDK initialization...');

  initPromise = (async () => {
    try {
      // Dynamically load SDK from CDN
      // Using version 0.2.0 as specified in FHE guide
      const sdk = await import('https://cdn.zama.ai/relayer-sdk-js/0.2.0/relayer-sdk-js.js');
      const { initSDK, createInstance, SepoliaConfig } = sdk;

      console.log('[FHE] SDK loaded, initializing WASM...');

      // Initialize WASM module (required before creating instance)
      await initSDK();

      console.log('[FHE] Creating FHE instance with SepoliaConfig...');

      // Create instance with Sepolia default configuration
      // IMPORTANT: Do not override 'network' property - it will break KMS decryption
      fheInstance = await createInstance(SepoliaConfig);

      console.log('[FHE] Instance initialized successfully');
      console.log('[FHE] Config:', {
        chainId: SepoliaConfig.chainId,
        network: SepoliaConfig.network,
        aclContract: SepoliaConfig.aclContractAddress,
        kmsContract: SepoliaConfig.kmsContractAddress
      });

      return fheInstance;
    } catch (error) {
      console.error('[FHE] Initialization failed:', error);
      // Reset state on failure
      initPromise = null;
      throw new Error(`FHE initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  })();

  return initPromise;
}

/**
 * Get the current FHE instance
 *
 * @returns FheInstance | null Current instance or null if not initialized
 */
export function getFheInstance(): any | null {
  return fheInstance;
}

/**
 * Reset FHE instance (useful for testing or forced re-initialization)
 */
export function resetFheInstance(): void {
  console.log('[FHE] Resetting instance');
  fheInstance = null;
  initPromise = null;
}

/**
 * Check if FHE instance is initialized
 *
 * @returns boolean True if instance is ready
 */
export function isFheInitialized(): boolean {
  return fheInstance !== null;
}
