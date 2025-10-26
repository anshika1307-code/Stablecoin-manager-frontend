import { useState } from 'react';
import { useNexus } from '../contexts/NexusContext';

import type {BridgeAndExecuteParams, BridgeAndExecuteResult, BridgeAndExecuteSimulationResult} from '@avail-project/nexus-core';
export const useNexusBridge = () => {
  const { sdk, isInitialized } = useNexus();
  const [bridging, setBridging] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulateBridgeandexecute = async (params: BridgeAndExecuteParams): Promise<BridgeAndExecuteSimulationResult | null> => {
    if (!sdk || !isInitialized) {
      setError('Nexus SDK not initialized');
      return null;
    }

    setSimulating(true);
    setError(null);

    try {
      const simulation = await sdk.simulateBridgeAndExecute(params);
      return simulation;
    } catch (err: any) {
      setError(err.message || 'Failed to simulate bridge and execute');
      console.error('Bridge and execute simulation error:', err);
      return null;
    } finally {
      setSimulating(false);
    }
  };

  const bridgeAndExecute = async (params: BridgeAndExecuteParams): Promise<BridgeAndExecuteResult | null> => {
    if (!sdk || !isInitialized) {
      setError('Nexus SDK not initialized');
      return null;
    }
    setBridging(true);
    setError(null);
    try {
      const result = await sdk.bridgeAndExecute(params);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to bridge and execute');
      console.error('Bridge and execute error:', err);
      return null;
    } finally {
      setBridging(false);
    }
  };

  return {
    bridgeAndExecute,
    simulateBridgeandexecute,
    bridging,
    simulating,
    error,
  };
};
