// components/WalletButton.tsx
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from './ui/button';
import { ArrowRight } from "lucide-react";

interface WalletButtonProps {
  onConnectedNavigate?: () => void; 
  showArrow?: boolean; 
}

export function WalletButton({ onConnectedNavigate, showArrow }: WalletButtonProps) {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        // Not connected
        if (!connected) {
          return (
            <Button
              onClick={() => {
                openConnectModal();
              }}
              className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white hover:shadow-2xl hover:shadow-[#3B82F6]/50 transition-all text-lg px-8"
            >
              Connect Wallet
              {showArrow && <ArrowRight className="ml-2 w-5 h-5" />}
            </Button>
          );
        }

        // Wrong network
        if (chain.unsupported) {
          return (
            <Button
              onClick={openChainModal}
              className="bg-red-400 text-white hover:bg-red-700"
            >
              Wrong Network
            </Button>
          );
        }

        // Connected
        return (
          <Button
            onClick={() => {
              if (onConnectedNavigate) onConnectedNavigate();
              else openAccountModal();
            }}
            className="font-mono text-white bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20"
          >
            {account.displayName}
            {account.displayBalance ? ` (${account.displayBalance})` : ''}
          </Button>
        );
      }}
    </ConnectButton.Custom>
  );
}
