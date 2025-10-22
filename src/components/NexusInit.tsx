import { useNexus } from '../contexts/NexusContext';
import { useAccount } from 'wagmi';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';

export const NexusInit = () => {
  const { isInitialized, isInitializing, initialize, error } = useNexus();
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="glass rounded-xl p-6 border border-white/10">
        <p className="text-white/60 text-center">
          Please connect your wallet to use Nexus features
        </p>
      </div>
    );
  }

  if (isInitialized) {
    return (
      <div className="glass rounded-xl p-6 border border-[#3B82F6]/30">
        <div className="flex items-center gap-2 text-[#3B82F6]">
          <div className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse" />
          <span>Nexus SDK Initialized</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6 border border-white/10">
      <div className="mb-4">
        <h3 className="text-lg mb-2">Initialize Nexus SDK</h3>
        <p className="text-white/60 text-sm">
          Initialize the Avail Nexus SDK to enable cross-chain operations
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <Button
        onClick={initialize}
        disabled={isInitializing}
        className="w-full bg-[#3B82F6] text-white hover:bg-[#3B82F6]/80"
      >
        {isInitializing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Initializing...
          </>
        ) : (
          'Initialize Nexus'
        )}
      </Button>
    </div>
  );
};
