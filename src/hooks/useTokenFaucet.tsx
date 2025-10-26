
import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { callFaucet, type TokenSymbol, type ChainId } from '../utils/tokenBalanceUtils';

export function useTokenFaucet() {
  const { connector, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const requestFaucet = useCallback(
    async (token: TokenSymbol, chainId: ChainId) => {
      if (!isConnected || !connector) {
        setError('Wallet not connected');
        return { success: false, error: 'Wallet not connected' };
      }

      setLoading(true);
      setError(null);
      setTxHash(null);

      try {
        // Get the provider from wagmi connector
        const provider = await connector.getProvider();
        
        if (!provider) {
          throw new Error('No provider available');
        }

  
        const result = await callFaucet(token, chainId, provider);

        if (result.success && result.txHash) {
          setTxHash(result.txHash);
          return { success: true, txHash: result.txHash };
        } else {
          setError(result.error || 'Faucet request failed');
          return { success: false, error: result.error };
        }
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to request faucet';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    [connector, isConnected]
  );

  return {
    requestFaucet,
    loading,
    error,
    txHash,
  };
}