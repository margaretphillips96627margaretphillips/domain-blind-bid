/**
 * FHE SDK Instance Management (Browser-only, CDN loaded)
 *
 * - SDK 0.3.0-5 is loaded via the script tag defined in index.html
 * - Avoid dynamic imports; rely entirely on the global object (same as BidExchange)
 * - Still uses a singleton so every hook shares the same instance
 */

declare global {
  interface Window {
    RelayerSDK?: any;
    relayerSDK?: any;
    ethereum?: any;
    okxwallet?: any;
  }
}

type FhevmInstance = any;

let fheInstance: FhevmInstance | null = null;

/**
 * Extract Relayer SDK from the window object
 */
function getSdkFromWindow() {
  if (typeof window === 'undefined') {
    throw new Error('[FHE] Relayer SDK requires a browser environment');
  }

  const sdk = window.RelayerSDK || window.relayerSDK;
  if (!sdk) {
    throw new Error('[FHE] Relayer SDK not loaded. Ensure the CDN script is present in index.html');
  }

  return sdk;
}

/**
 * Initialize FHE SDK (singleton)
 */
export async function initializeFHE(provider?: any): Promise<FhevmInstance> {
  if (fheInstance) {
    return fheInstance;
  }

  const sdk = getSdkFromWindow();
  const { initSDK, createInstance, SepoliaConfig } = sdk;

  await initSDK();

  const ethereumProvider =
    provider ||
    window.ethereum ||
    window.okxwallet?.provider ||
    window.okxwallet ||
    SepoliaConfig.network;

  const config = {
    ...SepoliaConfig,
    network: ethereumProvider,
  };

  fheInstance = await createInstance(config);
  return fheInstance;
}

export function isFheReady(): boolean {
  return fheInstance !== null;
}

export function getFheInstance(): FhevmInstance {
  if (!fheInstance) {
    throw new Error('[FHE] Instance not initialized. Call initializeFHE() first.');
  }
  return fheInstance;
}

export function resetFheInstance(): void {
  fheInstance = null;
}
