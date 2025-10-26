// import { motion } from "framer-motion";
// import { Button } from "../components/ui/button";
// import { useNexus } from "../contexts/NexusContext";
// import {
//   useTokenBalances,
//   TOKEN_CONFIG,
//   CHAIN_CONFIG,
//   type TokenSymbol,
//   type ChainId,
// } from "../utils/tokenBalanceUtils";
// import { useTokenFaucet } from "../hooks/useTokenFaucet";
// import { useEffect, useState } from "react";

// export default function FaucetActions() {
//   const { address } = useNexus();

//   // Fetch balances using our custom hook
//   const { loading: balancesLoading, refetch, getFormattedBalance } =
//     useTokenBalances(address);
//   const { requestFaucet } = useTokenFaucet();

//   // Track which token faucet is being requested
//   const [activeToken, setActiveToken] = useState<TokenSymbol | null>(null);

//   // Tokens and chains
//   const tokens = (Object.keys(TOKEN_CONFIG) as TokenSymbol[]).map((key) => ({
//     symbol: key,
//     name: TOKEN_CONFIG[key].name,
//   }));

//   const chains = (Object.keys(CHAIN_CONFIG) as unknown as ChainId[]).map(
//     (id) => ({
//       id: Number(id) as ChainId,
//       name: CHAIN_CONFIG[Number(id) as ChainId].name,
//     })
//   );

//   // Custom token colors
//   const tokensColor = [
//     { name: "ETH", color: "#8B5CF6" },
//     { name: "USDC", color: "#10B981" },
//     { name: "DAI", color: "#F59E0B" },
//     { name: "USDT", color: "#14B8A6" },
//     { name: "WETH", color: "#3B82F6" },
//     { name: "FDUSD", color: "#F97316" },
//   ];

//   // Refetch balances on address change
//   useEffect(() => {
//     if (address) refetch();
//   }, [address, refetch]);

//   // Get formatted balance
//   const getCurrentBalance = (token: TokenSymbol, chainId: ChainId) => {
//     return getFormattedBalance(token, chainId, TOKEN_CONFIG[token].decimals);
//   };

//   // Faucet handler for individual token
//   const handleFaucet = async (token: TokenSymbol, chainId: ChainId) => {
//     try {
//       setActiveToken(token);
//       await requestFaucet(token, chainId);
//       await refetch();
//     } catch (err) {
//       console.error("Faucet request failed:", err);
//     } finally {
//       setActiveToken(null);
//     }
//   };

//   return (
//     <div className="min-h-screen pt-24 pb-12">
//       <div className="container mx-auto px-6">
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.2 }}
//           className="bg-white/5 rounded-2xl p-6 border border-white/10"
//         >
//           <h2 className="text-xl mb-6">Faucet Actions</h2>

//           <div className="space-y-3">
//             {tokens.map((token, index) => {
//               const tokenColor =
//                 tokensColor.find((t) => t.name === token.symbol)?.color ||
//                 "#8B5CF6";

//               const isLoading = activeToken === token.symbol;
//               console.log("Faucet balance:", token, chains[0].id);
//               return (
//                 <motion.div
//                   key={token.symbol}
//                   initial={{ opacity: 0, x: -20 }}
//                   animate={{ opacity: 1, x: 0 }}
//                   transition={{ delay: 0.3 + index * 0.1 }}
//                   className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
//                 >
//                   {/* Left: Token info */}
//                   <div className="flex items-center gap-4">
//                     <div
//                       className="w-10 h-10 rounded-lg flex items-center justify-center font-bold"
//                       style={{
//                         background: `${tokenColor}20`,
//                         color: tokenColor,
//                       }}
//                     >
//                       {token.symbol}
//                     </div>

//                     <div>
//                       <div className="font-medium">{token.name}</div>
//                       <div className="text-sm text-white/60">
//                         Balance:{" "}
//                         {balancesLoading
//                           ? "Loading..."
//                           : getCurrentBalance(token.symbol, chains[0].id)}
//                       </div>
//                     </div>
//                   </div>
                  
//                   {/* Right: Faucet button */}
//                   <Button
//                     disabled={isLoading}
//                     className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm"
//                     onClick={() => handleFaucet(token.symbol, chains[0].id)}
//                   >
//                     {isLoading ? "Requesting..." : "Faucet"}
//                   </Button>
//                 </motion.div>
//               );
//             })}
//           </div>
//         </motion.div>
//       </div>
//     </div>
//   );
// }


import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { useNexus } from "../contexts/NexusContext";
import {
  useTokenBalances,
  TOKEN_CONFIG,
  CHAIN_CONFIG,
  type TokenSymbol,
  type ChainId,
} from "../utils/tokenBalanceUtils";
import { useTokenFaucet } from "../hooks/useTokenFaucet";
import { useEffect, useState } from "react";

export default function FaucetActions() {
  const { address } = useNexus();

  // Custom hooks
  const { loading: balancesLoading, refetch, getFormattedBalance } =
    useTokenBalances(address);
  const { requestFaucet } = useTokenFaucet();

  // Local state
  const [activeToken, setActiveToken] = useState<TokenSymbol | null>(null);
  const [selectedChains, setSelectedChains] = useState<Record<TokenSymbol, ChainId>>(
    () =>
      (Object.keys(TOKEN_CONFIG) as TokenSymbol[]).reduce(
        (acc, symbol) => ({
          ...acc,
          [symbol]: (Object.keys(CHAIN_CONFIG)[0] as unknown as ChainId),
        }),
        {} as Record<TokenSymbol, ChainId>
      )
  );

  // Tokens and chains
  const tokens = (Object.keys(TOKEN_CONFIG) as TokenSymbol[]).map((key) => ({
    symbol: key,
    name: TOKEN_CONFIG[key].name,
  }));

  const chains = (Object.keys(CHAIN_CONFIG) as unknown as ChainId[]).map((id) => ({
    id: Number(id) as ChainId,
    name: CHAIN_CONFIG[Number(id) as ChainId].name,
  }));

  // Custom token colors
  const tokensColor = [
    { name: "ETH", color: "#8B5CF6" },
    { name: "USDC", color: "#10B981" },
    { name: "DAI", color: "#F59E0B" },
    { name: "USDT", color: "#14B8A6" },
    { name: "WETH", color: "#3B82F6" },
    { name: "FDUSD", color: "#F97316" },
  ];

  // Initialize default chain selection
  useEffect(() => {
    const defaultChains: Record<TokenSymbol, ChainId> = tokens.reduce((acc, t) => {
      acc[t.symbol] = chains[0].id; // default to first chain
      return acc;
    }, {} as Record<TokenSymbol, ChainId>);
    setSelectedChains(defaultChains);
  }, []);

  // Refetch balances on wallet change
  useEffect(() => {
    if (address) refetch();
  }, [address, refetch]);

  // Helpers
  const getCurrentBalance = (token: TokenSymbol, chainId: ChainId) =>
    getFormattedBalance(token, chainId, TOKEN_CONFIG[token].decimals);

  const handleChainChange = (token: TokenSymbol, newChainId: ChainId) => {
    setSelectedChains((prev) => ({ ...prev, [token]: newChainId }));
  };

  const handleFaucet = async (token: TokenSymbol) => {
    const chainId = selectedChains[token];
    if (!chainId) return;

    try {
      setActiveToken(token);
      await requestFaucet(token, chainId);
      await new Promise(resolve => setTimeout(resolve, 3000));
      await refetch();
    } catch (err) {
      console.error("Faucet request failed:", err);
    } finally {
      setActiveToken(null);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 rounded-2xl p-6 border border-white/10"
        >
          <h2 className="text-xl mb-6">Faucet Actions</h2>

          <div className="space-y-3">
            {tokens.map((token, index) => {
              const tokenColor =
                tokensColor.find((t) => t.name === token.symbol)?.color || "#8B5CF6";
              const isLoading = activeToken === token.symbol;
              const selectedChain = selectedChains[token.symbol] || chains[0].id;

              return (
                <motion.div
                  key={token.symbol}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
                >
                  {/* Left: Token info */}
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold"
                      style={{
                        background: `${tokenColor}20`,
                        color: tokenColor,
                      }}
                    >
                      {token.symbol}
                    </div>

                    <div>
                      <div className="font-medium">{token.name}</div>
                      <div className="text-sm text-white/60">
                        Balance:{" "}
                        {balancesLoading
                          ? "Loading..."
                          : getCurrentBalance(token.symbol, selectedChain)}
                      </div>
                    </div>
                  </div>

                  {/* Right: Chain select + Faucet button */}
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedChain}
                      onChange={(e) =>
                        handleChainChange(token.symbol, Number(e.target.value) as ChainId)
                      }
                      className="bg-white/10 text-white text-sm px-2 py-1 rounded-md border border-white/20 outline-none"
                    >
                      {chains.map((chain) => (
                        <option
                          key={chain.id}
                          value={chain.id}
                          className="bg-gray-900 text-white"
                        >
                          {chain.name}
                        </option>
                      ))}
                    </select>

                    <Button
                      disabled={isLoading}
                      className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm"
                      onClick={() => handleFaucet(token.symbol)}
                    >
                      {isLoading ? "Requesting..." : "Faucet"}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
