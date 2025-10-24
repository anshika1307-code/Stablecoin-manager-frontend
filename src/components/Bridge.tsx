import { useState } from 'react';
import { useNexusBridge } from '../hooks/useNexusBridge';
import { useNexus } from '../contexts/NexusContext';
import { Button } from './ui/button';
import { Loader2, ArrowRightLeft } from 'lucide-react';
import type { BridgeParams } from '@avail-project/nexus-core';

const SUPPORTED_CHAINS = [
  { id: 11155111, name: 'Sepolia' },
  { id: 84532, name: 'Base Sepolia' },
  { id: 421614, name: 'Arbitrum Sepolia' },
  { id: 80002, name: 'Polygon Amoy' },
  { id: 11155420, name: 'Optimism Sepolia' },
];

const TOKENS = ['ETH', 'USDC', 'USDT', 'DAI'];

export const Bridge = () => {
  const { isInitialized } = useNexus();
  const { bridge, simulateBridge, bridging, simulating, error } = useNexusBridge();
  const [token, setToken] = useState('ETH');
  const [amount, setAmount] = useState('');
  const [destinationChain, setDestinationChain] = useState(SUPPORTED_CHAINS[1].id);
  const [simulation, setSimulation] = useState<any>(null);

  const handleSimulate = async () => {
    const params = {
      token: token as any,
      amount: parseFloat(amount),
      chainId: destinationChain as any,
    } as BridgeParams;

    const result = await simulateBridge(params);
    setSimulation(result);
  };

  const handleBridge = async () => {
    const params = {
      token: token as any,
      amount: parseFloat(amount),
      chainId: destinationChain as any,
    } as BridgeParams;

    const result = await bridge(params);
    if (result?.success) {
      setAmount('');
      setSimulation(null);
      alert('Bridge successful!');
    }
  };

  if (!isInitialized) {
    return (
      <div className="glass rounded-xl p-6 border border-white/10">
        <p className="text-white/60 text-center">
          Please initialize Nexus SDK to use Bridge
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6 border border-white/10">
      <div className="flex items-center gap-2 mb-6">
        <ArrowRightLeft className="w-5 h-5 text-[#3B82F6]" />
        <h3 className="text-xl">Bridge Tokens</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-white/60 mb-2">Token</label>
          <select
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
          >
            {TOKENS.map((t) => (
              <option key={t} value={t} className="bg-[#0F172A]">{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-2">Amount</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-2">Destination Chain</label>
          <select
            value={destinationChain}
            onChange={(e) => setDestinationChain(parseInt(e.target.value))}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
          >
            {SUPPORTED_CHAINS.map((chain) => (
              <option key={chain.id} value={chain.id} className="bg-[#0F172A]">
                {chain.name}
              </option>
            ))}
          </select>
        </div>

        {simulation && (
          <div className="p-4 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30">
            <p className="text-sm text-white/60 mb-2">Estimated Fees:</p>
            <pre className="text-xs text-white/80 overflow-auto">
              {JSON.stringify(simulation.intent?.fees, null, 2)}
            </pre>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleSimulate}
            disabled={!amount || simulating}
            className="flex-1 bg-white/10 text-white hover:bg-white/20"
          >
            {simulating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Simulating...
              </>
            ) : (
              'Simulate'
            )}
          </Button>

          <Button
            onClick={handleBridge}
            disabled={!amount || bridging}
            className="flex-1 bg-[#3B82F6] text-white hover:bg-[#3B82F6]/80"
          >
            {bridging ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Bridging...
              </>
            ) : (
              ' Test Bridge'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
