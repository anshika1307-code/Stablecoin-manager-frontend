// import { ethers } from 'ethers';

// // Token configuration
// export const TOKEN_CONFIG = {
//   USDC: {
//     symbol: 'USDC',
//     name: 'USD Coin',
//     decimals: 6,
//     addresses: {
//       11155111: '0x72E4AF81B73E7fc29156f6FfA8E8413E4385b2D8', // Sepolia
//       84532: '0xF79dd583eDb09c80a0b2FF0cd1B274F1Ec361cA4',    // Base Sepolia
//     },
//   },
//   USDT: {
//     symbol: 'USDT',
//     name: 'Tether USD',
//     decimals: 6,
//     addresses: {
//       11155111: '0x3d90917bBB02bb156B2eD7BEDb20d84d7E49b135', // Sepolia
//       84532: '0x55e877aEF97A918D3c7f729a691F7DC9831A5695',    // Base Sepolia
//     },
//   },
//   WETH: {
//     symbol: 'WETH',
//     name: 'Wrapped Ether',
//     decimals: 18,
//     addresses: {
//       11155111: '0x3981A8CdB4d2C532FF4eB76a4A0d51CAd74b3b5a', // Sepolia
//       84532: '0x6FB9A9D890649d7933d8F3Ccb629eC7300324648',    // Base Sepolia
//     },
//   },
//   DAI: {
//     symbol: 'DAI',
//     name: 'Dai Stablecoin',
//     decimals: 18,
//     addresses: {
//       11155111: '0xB83116BEEee7e381b64836C858c8CEa011D8e287', // Sepolia
//       84532: '0x4791ECf0cd71e81F243Ccb68112179AD6603Ed4c',    // Base Sepolia
//     },
//   },
// } as const;

// // Chain configuration
// export const CHAIN_CONFIG = {
//   11155111: {
//     name: 'Sepolia',
//     rpc: 'https://ethereum-sepolia.publicnode.com',
//   },
//   84532: {
//     name: 'Base Sepolia',
//     rpc: 'https://sepolia.base.org',
//   },
// } as const;

// // ERC20 ABI for balance checking
// const ERC20_ABI = [
//   'function balanceOf(address) view returns (uint256)',
//   'function decimals() view returns (uint8)',
//   'function symbol() view returns (string)',
// ];

// // Types
// export type TokenSymbol = keyof typeof TOKEN_CONFIG;
// export type ChainId = keyof typeof CHAIN_CONFIG;

// export interface TokenBalance {
//   token: TokenSymbol;
//   symbol: string;
//   name: string;
//   balance: string; // Formatted balance (e.g., "1000.50")
//   balanceRaw: string; // Raw balance in wei/smallest unit
//   decimals: number;
//   chainId: number;
//   chainName: string;
//   address: string;
// }

// export interface BalanceError {
//   token: TokenSymbol;
//   chainId: number;
//   error: string;
// }

// /**
//  * Fetch balance for a single token on a single chain
//  */
// export async function fetchTokenBalance(
//   tokenSymbol: TokenSymbol,
//   chainId: ChainId,
//   userAddress: string
// ): Promise<TokenBalance | null> {
//   try {
//     const tokenConfig = TOKEN_CONFIG[tokenSymbol];
//     const chainConfig = CHAIN_CONFIG[chainId];
//     const tokenAddress = tokenConfig.addresses[chainId];

//     if (!tokenAddress) {
//       console.warn(`Token ${tokenSymbol} not available on chain ${chainId}`);
//       return null;
//     }

//     // Create provider
//     const provider = new ethers.JsonRpcProvider(chainConfig.rpc);

//     // Create contract instance
//     const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

//     // Fetch balance
//     const balanceRaw = await contract.balanceOf(userAddress);
//     const balance = ethers.formatUnits(balanceRaw, tokenConfig.decimals);

//     return {
//       token: tokenSymbol,
//       symbol: tokenConfig.symbol,
//       name: tokenConfig.name,
//       balance,
//       balanceRaw: balanceRaw.toString(),
//       decimals: tokenConfig.decimals,
//       chainId: Number(chainId),
//       chainName: chainConfig.name,
//       address: tokenAddress,
//     };
//   } catch (error: any) {
//     console.error(`Error fetching ${tokenSymbol} balance on chain ${chainId}:`, error.message);
//     return null;
//   }
// }

// /**
//  * Fetch balances for multiple tokens on multiple chains
//  */
// export async function fetchAllBalances(
//   userAddress: string,
//   tokens: TokenSymbol[] = ['USDC', 'USDT', 'WETH', 'DAI'],
//   chains: ChainId[] = [11155111, 84532]
// ): Promise<{
//   balances: TokenBalance[];
//   errors: BalanceError[];
// }> {
//   const balances: TokenBalance[] = [];
//   const errors: BalanceError[] = [];

//   // Fetch all balances concurrently
//   const promises = tokens.flatMap((token) =>
//     chains.map(async (chainId) => {
//       try {
//         const balance = await fetchTokenBalance(token, chainId, userAddress);
//         if (balance) {
//           balances.push(balance);
//         }
//       } catch (error: any) {
//         errors.push({
//           token,
//           chainId: Number(chainId),
//           error: error.message,
//         });
//       }
//     })
//   );

//   await Promise.all(promises);

//   return { balances, errors };
// }

// /**
//  * Get balance for a specific token on a specific chain
//  */
// export function getBalance(
//   balances: TokenBalance[],
//   token: TokenSymbol,
//   chainId: number
// ): TokenBalance | undefined {
//   return balances.find((b) => b.token === token && b.chainId === chainId);
// }

// /**
//  * Get formatted balance string
//  */
// export function getFormattedBalance(
//   balances: TokenBalance[],
//   token: TokenSymbol,
//   chainId: number,
//   decimals: number = 2
// ): string {
//   const balance = getBalance(balances, token, chainId);
//   if (!balance) return '0.00';
  
//   const num = parseFloat(balance.balance);
//   return num.toFixed(decimals);
// }

// /**
//  * Get total balance across all chains for a specific token
//  */
// export function getTotalBalance(
//   balances: TokenBalance[],
//   token: TokenSymbol
// ): string {
//   const total = balances
//     .filter((b) => b.token === token)
//     .reduce((sum, b) => sum + parseFloat(b.balance), 0);
  
//   return total.toFixed(2);
// }

// /**
//  * Hook for fetching balances in React components
//  */
// export function useTokenBalances(userAddress: string | undefined) {
//   const [balances, setBalances] = React.useState<TokenBalance[]>([]);
//   const [loading, setLoading] = React.useState(false);
//   const [error, setError] = React.useState<string | null>(null);

//   const fetchBalances = React.useCallback(async () => {
//     if (!userAddress) {
//       setBalances([]);
//       return;
//     }

//     setLoading(true);
//     setError(null);

//     try {
//       const { balances: fetchedBalances, errors } = await fetchAllBalances(userAddress);
//       setBalances(fetchedBalances);

//       if (errors.length > 0) {
//         console.warn('Some balances failed to fetch:', errors);
//       }
//     } catch (err: any) {
//       setError(err.message);
//       console.error('Error fetching balances:', err);
//     } finally {
//       setLoading(false);
//     }
//   }, [userAddress]);

//   React.useEffect(() => {
//     fetchBalances();
//   }, [fetchBalances]);

//   return {
//     balances,
//     loading,
//     error,
//     refetch: fetchBalances,
//     getBalance: (token: TokenSymbol, chainId: number) => getBalance(balances, token, chainId),
//     getFormattedBalance: (token: TokenSymbol, chainId: number, decimals?: number) =>
//       getFormattedBalance(balances, token, chainId, decimals),
//     getTotalBalance: (token: TokenSymbol) => getTotalBalance(balances, token),
//   };
// }

// // Re-export React for the hook
// import * as React from 'react';


import { ethers } from 'ethers';

// Token configuration
export const TOKEN_CONFIG = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    addresses: {
      11155111: '0x72E4AF81B73E7fc29156f6FfA8E8413E4385b2D8', // Sepolia
      84532: '0xF79dd583eDb09c80a0b2FF0cd1B274F1Ec361cA4',    // Base Sepolia
    },
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    addresses: {
      11155111: '0x3d90917bBB02bb156B2eD7BEDb20d84d7E49b135', // Sepolia
      84532: '0x55e877aEF97A918D3c7f729a691F7DC9831A5695',    // Base Sepolia
    },
  },
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    addresses: {
      11155111: '0x3981A8CdB4d2C532FF4eB76a4A0d51CAd74b3b5a', // Sepolia
      84532: '0x6FB9A9D890649d7933d8F3Ccb629eC7300324648',    // Base Sepolia
    },
  },
  DAI: {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    addresses: {
      11155111: '0xB83116BEEee7e381b64836C858c8CEa011D8e287', // Sepolia
      84532: '0x4791ECf0cd71e81F243Ccb68112179AD6603Ed4c',    // Base Sepolia
    },
  },
} as const;

// Chain configuration
export const CHAIN_CONFIG = {
  11155111: {
    name: 'Sepolia',
    rpc: 'https://ethereum-sepolia.publicnode.com',
  },
  84532: {
    name: 'Base Sepolia',
    rpc: 'https://sepolia.base.org',
  },
} as const;

// ERC20 ABI for balance checking
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

// Types
export type TokenSymbol = keyof typeof TOKEN_CONFIG;
export type ChainId = keyof typeof CHAIN_CONFIG;

export interface TokenBalance {
  token: TokenSymbol;
  symbol: string;
  name: string;
  balance: string; // Formatted balance (e.g., "1000.50")
  balanceRaw: string; // Raw balance in wei/smallest unit
  decimals: number;
  chainId: number;
  chainName: string;
  address: string;
}

export interface BalanceError {
  token: TokenSymbol;
  chainId: number;
  error: string;
}

/**
 * Fetch balance for a single token on a single chain
 */
export async function fetchTokenBalance(
  tokenSymbol: TokenSymbol,
  chainId: ChainId,
  userAddress: string
): Promise<TokenBalance | null> {
  try {
    const tokenConfig = TOKEN_CONFIG[tokenSymbol];
    const chainConfig = CHAIN_CONFIG[chainId];
    const tokenAddress = tokenConfig.addresses[chainId];

    if (!tokenAddress) {
      console.warn(`Token ${tokenSymbol} not available on chain ${chainId}`);
      return null;
    }

    // Create provider
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);

    // Create contract instance
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

    // Fetch balance
    const balanceRaw = await contract.balanceOf(userAddress);
    const balance = ethers.formatUnits(balanceRaw, tokenConfig.decimals);

    return {
      token: tokenSymbol,
      symbol: tokenConfig.symbol,
      name: tokenConfig.name,
      balance,
      balanceRaw: balanceRaw.toString(),
      decimals: tokenConfig.decimals,
      chainId: Number(chainId),
      chainName: chainConfig.name,
      address: tokenAddress,
    };
  } catch (error: any) {
    console.error(`Error fetching ${tokenSymbol} balance on chain ${chainId}:`, error.message);
    return null;
  }
}

/**
 * Fetch balances for multiple tokens on multiple chains
 */
export async function fetchAllBalances(
  userAddress: string,
  tokens: TokenSymbol[] = ['USDC', 'USDT', 'WETH', 'DAI'],
  chains: ChainId[] = [11155111, 84532]
): Promise<{
  balances: TokenBalance[];
  errors: BalanceError[];
}> {
  const balances: TokenBalance[] = [];
  const errors: BalanceError[] = [];

  // Fetch all balances concurrently
  const promises = tokens.flatMap((token) =>
    chains.map(async (chainId) => {
      try {
        const balance = await fetchTokenBalance(token, chainId, userAddress);
        if (balance) {
          balances.push(balance);
        }
      } catch (error: any) {
        errors.push({
          token,
          chainId: Number(chainId),
          error: error.message,
        });
      }
    })
  );

  await Promise.all(promises);

  return { balances, errors };
}

/**
 * Get balance for a specific token on a specific chain
 */
export function getBalance(
  balances: TokenBalance[],
  token: TokenSymbol,
  chainId: number
): TokenBalance | undefined {
  return balances.find((b) => b.token === token && b.chainId === chainId);
}

/**
 * Get formatted balance string
 */
export function getFormattedBalance(
  balances: TokenBalance[],
  token: TokenSymbol,
  chainId: number,
  decimals: number = 2
): string {
  const balance = getBalance(balances, token, chainId);
  if (!balance) return '0.00';
  
  const num = parseFloat(balance.balance);
  return num.toFixed(decimals);
}

/**
 * Get total balance across all chains for a specific token
 */
export function getTotalBalance(
  balances: TokenBalance[],
  token: TokenSymbol
): string {
  const total = balances
    .filter((b) => b.token === token)
    .reduce((sum, b) => sum + parseFloat(b.balance), 0);
  
  return total.toFixed(2);
}

/**
 * Hook for fetching balances in React components
 */
export function useTokenBalances(userAddress: string | undefined) {
  const [balances, setBalances] = React.useState<TokenBalance[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchBalances = React.useCallback(async () => {
    if (!userAddress) {
      setBalances([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { balances: fetchedBalances, errors } = await fetchAllBalances(userAddress);
      setBalances(fetchedBalances);

      if (errors.length > 0) {
        console.warn('Some balances failed to fetch:', errors);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching balances:', err);
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  React.useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return {
    balances,
    loading,
    error,
    refetch: fetchBalances,
    getBalance: (token: TokenSymbol, chainId: number) => getBalance(balances, token, chainId),
    getFormattedBalance: (token: TokenSymbol, chainId: number, decimals?: number) =>
      getFormattedBalance(balances, token, chainId, decimals),
    getTotalBalance: (token: TokenSymbol) => getTotalBalance(balances, token),
  };
}

// Re-export React for the hook
import * as React from 'react';