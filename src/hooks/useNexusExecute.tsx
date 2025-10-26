import { useState } from 'react';
import { useNexus } from '../contexts/NexusContext';
import type {
  ExecuteParams,
  ExecuteResult,
    ExecuteSimulation,
} from '@avail-project/nexus-core';


export const useNexusExecute = () => {
  const { sdk, isInitialized } = useNexus();
  const [executing, setExecuting] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

    const simulateExecute = async (params: ExecuteParams): Promise<ExecuteSimulation | null> => {
         
    if (!sdk || !isInitialized) {
      setError('Nexus SDK not initialized');
      return null;
    }

    setSimulating(true);
    setError(null);

    try {
      const result = await sdk.simulateExecute(params);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to simulate execution');
      console.error('Execution simulation error:', err);
      return null;
    } finally {
      setSimulating(false);
    }
  };

  const execute = async (params: ExecuteParams): Promise<ExecuteResult | null> => {
    
    if (!sdk || !isInitialized) {
      setError('Nexus SDK not initialized');
      return null;
    }

    setExecuting(true);
    setError(null);

    try {
      const result = await sdk.execute(params);
      if (!result.transactionHash) {
        throw new Error('Execution failed');
      }
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to execute transaction');
      console.error('Execution error:', err);
      return null;
    } finally {
      setExecuting(false);
    }
  };
  

    return {
      executing,
      simulating,
      error,
      simulateExecute,
      execute,
    };
};