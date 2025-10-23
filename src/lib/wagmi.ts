import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  mainnet, base, arbitrum, polygon,
  sepolia,       
  baseSepolia,   
  arbitrumSepolia,
  polygonAmoy,    
  optimismSepolia, 
} from "wagmi/chains";

export const config = getDefaultConfig({
  appName: 'StableGuard AI',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
    chains: [mainnet, arbitrum, polygon, base, sepolia, baseSepolia, arbitrumSepolia, polygonAmoy, optimismSepolia],
  ssr: false,
});
