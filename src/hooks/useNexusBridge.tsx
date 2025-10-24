import { useState } from 'react';
import { useNexus } from '../contexts/NexusContext';
import type { BridgeParams, BridgeResult, SimulationResult } from '@avail-project/nexus-core';

export const useNexusBridge = () => {
  const { sdk, isInitialized } = useNexus();
  const [bridging, setBridging] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulateBridge = async (params: BridgeParams): Promise<SimulationResult | null> => {
    if (!sdk || !isInitialized) {
      setError('Nexus SDK not initialized');
      return null;
    }

    setSimulating(true);
    setError(null);

    try {
      const simulation = await sdk.simulateBridge(params);
      return simulation;
    } catch (err: any) {
      setError(err.message || 'Failed to simulate bridge');
      console.error('Bridge simulation error:', err);
      return null;
    } finally {
      setSimulating(false);
    }
  };

  const bridge = async (params: BridgeParams): Promise<BridgeResult | null> => {
    if (!sdk || !isInitialized) {
      setError('Nexus SDK not initialized');
      return null;
    }

    setBridging(true);
    setError(null);

    try {
      const result = await sdk.bridge(params);
      if (!result.success) {
        throw new Error(result.error || 'Bridge failed');
      }
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to bridge tokens');
      console.error('Bridge error:', err);
      return null;
    } finally {
      setBridging(false);
    }
  };

  return {
    bridge,
    simulateBridge,
    bridging,
    simulating,
    error,
  };
};
