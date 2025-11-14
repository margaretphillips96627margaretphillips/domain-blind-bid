/**
 * FHE Context Provider
 *
 * Global provider for Fully Homomorphic Encryption (FHE) functionality.
 * Manages FHE SDK lifecycle with lazy initialization pattern.
 *
 * Features:
 * - Singleton FHE instance shared across the application
 * - Automatic initialization on first use
 * - Loading state management for async SDK initialization
 * - Error handling and recovery mechanisms
 * - Manual reset capability for testing purposes
 *
 * @module FheProvider
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { initializeFHE, getFheInstance, isFheInitialized } from '@/utils/fheInstance';

/**
 * FHE Context value type
 */
interface FheContextValue {
  fhe: any | null;
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  reset: () => void;
}

/**
 * FHE Context
 */
const FheContext = createContext<FheContextValue | undefined>(undefined);

/**
 * FHE Provider Props
 */
interface FheProviderProps {
  children: ReactNode;
}

/**
 * FHE Provider Component
 *
 * Wraps the application to provide FHE functionality
 * Handles lazy initialization on first use
 */
export function FheProvider({ children }: FheProviderProps) {
  const [fhe, setFhe] = useState<any | null>(getFheInstance());
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize FHE SDK
   * Safe to call multiple times - will return existing instance
   */
  const initialize = useCallback(async () => {
    // Already initialized
    if (isFheInitialized()) {
      setFhe(getFheInstance());
      return;
    }

    // Already initializing
    if (isInitializing) {
      console.log('[FheProvider] Initialization already in progress');
      return;
    }

    try {
      setIsInitializing(true);
      setError(null);

      console.log('[FheProvider] Starting FHE initialization...');

      const instance = await initializeFHE();
      setFhe(instance);

      console.log('[FheProvider] FHE initialization complete');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize FHE SDK';
      console.error('[FheProvider] Initialization error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsInitializing(false);
    }
  }, [isInitializing]);

  /**
   * Reset FHE instance
   * Useful for testing or forced re-initialization
   */
  const reset = useCallback(() => {
    console.log('[FheProvider] Resetting FHE instance');
    setFhe(null);
    setError(null);
    setIsInitializing(false);
  }, []);

  const value: FheContextValue = {
    fhe,
    isInitialized: isFheInitialized(),
    isInitializing,
    error,
    initialize,
    reset,
  };

  return <FheContext.Provider value={value}>{children}</FheContext.Provider>;
}

/**
 * Hook to use FHE context
 *
 * @returns FheContextValue
 * @throws Error if used outside FheProvider
 */
export function useFhe(): FheContextValue {
  const context = useContext(FheContext);

  if (context === undefined) {
    throw new Error('useFhe must be used within FheProvider');
  }

  return context;
}

/**
 * Hook to get FHE instance with auto-initialization
 *
 * @returns Object with fhe instance and loading state
 */
export function useFheInstance() {
  const { fhe, isInitialized, isInitializing, initialize, error } = useFhe();

  return {
    fhe,
    isReady: isInitialized && fhe !== null,
    isLoading: isInitializing,
    error,
    initialize,
  };
}
