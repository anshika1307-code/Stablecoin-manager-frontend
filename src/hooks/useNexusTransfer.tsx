import { useState } from 'react';
import { useNexus } from '../contexts/NexusContext';
import type { TransferParams, TransferResult, SimulationResult } from '@avail-project/nexus-core';

export const useNexusTransfer = () => {
  const { sdk, isInitialized } = useNexus();
  const [transferring, setTransferring] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulateTransfer = async (params: TransferParams): Promise<SimulationResult | null> => {
    if (!sdk || !isInitialized) {
      setError('Nexus SDK not initialized');
      return null;
    }

    setSimulating(true);
    setError(null);

    try {
      const simulation = await sdk.simulateTransfer(params);
      return simulation;
    } catch (err: any) {
      setError(err.message || 'Failed to simulate transfer');
      console.error('Transfer simulation error:', err);
      return null;
    } finally {
      setSimulating(false);
    }
  };

  const transfer = async (params: TransferParams): Promise<TransferResult | null> => {
    if (!sdk || !isInitialized) {
      setError('Nexus SDK not initialized');
      return null;
    }

    setTransferring(true);
    setError(null);

    try {
      const result = await sdk.transfer(params);
      if (!result.success) {
        throw new Error(result.error || 'Transfer failed');
      }
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to transfer tokens');
      console.error('Transfer error:', err);
      return null;
    } finally {
      setTransferring(false);
    }
  };

  return {
    transfer,
    simulateTransfer,
    transferring,
    simulating,
    error,
  };
};
