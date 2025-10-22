import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { createNexusSDK, initializeNexus, isNexusInitialized } from '../lib/nexus';
import type { NexusSDK } from '@avail-project/nexus-core';

interface NexusContextType {
  sdk: NexusSDK | null;
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  deinitialize: () => void;
}

const NexusContext = createContext<NexusContextType | undefined>(undefined);

export const NexusProvider = ({ children }: { children: ReactNode }) => {
  const { connector, isConnected } = useAccount();
  const [sdk, setSdk] = useState<NexusSDK | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nexusSdk = createNexusSDK('testnet');
    setSdk(nexusSdk);
  }, []);

  const initialize = async () => {
    if (!isConnected || !connector) {
      setError('Wallet not connected');
      return;
    }

    setIsInitializing(true);
    setError(null);

    try {
      const provider = await connector.getProvider();
      if (!provider) {
        throw new Error('No provider found');
      }

      await initializeNexus(provider);
      setIsInitialized(true);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Nexus SDK');
      console.error('Nexus initialization error:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  const deinitialize = () => {
    setIsInitialized(false);
    setError(null);
  };

  useEffect(() => {
    if (!isConnected) {
      setIsInitialized(false);
      setError(null);
    }
  }, [isConnected]);

  useEffect(() => {
    setIsInitialized(isNexusInitialized());
  }, []);

  return (
    <NexusContext.Provider
      value={{
        sdk,
        isInitialized,
        isInitializing,
        error,
        initialize,
        deinitialize,
      }}
    >
      {children}
    </NexusContext.Provider>
  );
};

export const useNexus = () => {
  const context = useContext(NexusContext);
  if (context === undefined) {
    throw new Error('useNexus must be used within a NexusProvider');
  }
  return context;
};
