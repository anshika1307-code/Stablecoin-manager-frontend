import { useState, useEffect } from 'react';
import { useNexus } from '../contexts/NexusContext';
import type { UserAsset } from '@avail-project/nexus-core';

export const useNexusBalance = () => {
  const { sdk, isInitialized } = useNexus();
  const [balances, setBalances] = useState<UserAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = async () => {
    if (!sdk || !isInitialized) {
      setError('Nexus SDK not initialized');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const unifiedBalances = await sdk.getUnifiedBalances();
      setBalances(unifiedBalances || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch balances');
      console.error('Balance fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isInitialized) {
      fetchBalances();
    }
  }, [isInitialized]);

  return {
    balances,
    loading,
    error,
    refetch: fetchBalances,
  };
};
