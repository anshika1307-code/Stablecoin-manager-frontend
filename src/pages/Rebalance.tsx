import { motion } from "framer-motion";
import { ArrowRight, ArrowUpDown, CheckCircle, Info, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useNexusBridge } from "../hooks/useNexusBridge";
import { useNexusExecute } from "../hooks/useNexusExecute";
import { useNexus } from "../contexts/NexusContext";
import { Button } from "../components/ui/button";
import { TabsContent, TabsList, TabsTrigger, Tabs } from "../components/ui/tabs";
import {
  useTokenBalances,
  TOKEN_CONFIG,
  CHAIN_CONFIG,
  type TokenSymbol,
  type ChainId
} from "../utils/tokenBalanceUtils";
import { calculateSwapOutput, getExchangeRate } from '../utils/swapCalculator';

// Router addresses per chain
const ROUTER_ADDRESSES: Record<number, string> = {
  11155111: '0x60aE531D9448445fC6d9Da4f4B0e87940711126d',
  84532: '0xBF4082e927886df91a996EbEF07cd4E85B03C300',
};

const MOCK_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
] as const;

export function RebalancePage() {
  const { address } = useNexus();
  const { bridge, bridging, simulateBridge } = useNexusBridge();
  const { execute, executing, simulateExecute } = useNexusExecute();

  // Fetch balances using our custom hook
  const { balances, loading: balancesLoading, refetch, getFormattedBalance } = useTokenBalances(address);

  const [isComplete, setIsComplete] = useState(false);
  const [fromToken, setFromToken] = useState<TokenSymbol>("USDC");
  const [toToken, setToToken] = useState<TokenSymbol>("WETH");
  const [fromChain, setFromChain] = useState<ChainId>(11155111);
  const [toChain, setToChain] = useState<ChainId>(11155111);
  const [swapAmount, setSwapAmount] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [swapError, setSwapError] = useState("");
  const [activeTab, setActiveTab] = useState("manual-swap");
  
  // Simulation states
  const [simulatedBridge, setSimulatedBridge] = useState<any>(null);
  const [simulatedExecute, setSimulatedExecute] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState("");

  // Get available tokens and chains from config
  const tokens = (Object.keys(TOKEN_CONFIG) as TokenSymbol[]).map((key) => ({
    symbol: key,
    name: TOKEN_CONFIG[key].name,
  }));

  const chains = (Object.keys(CHAIN_CONFIG) as unknown as ChainId[]).map((id) => ({
    id: Number(id) as ChainId,
    name: CHAIN_CONFIG[Number(id) as ChainId].name,
  }));

  // Refetch balances when wallet connects
  useEffect(() => {
    if (address) {
      refetch();
    }
  }, [address, refetch]);

  // Get current balance for selected token and chain
  const getCurrentBalance = (token: TokenSymbol, chainId: ChainId) => {
    return getFormattedBalance(token, chainId, TOKEN_CONFIG[token].decimals);
  };

  // Debounced simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (swapAmount && parseFloat(swapAmount) > 0 && address) {
        handleSimulateSwap();
      } else {
        // Clear simulation results when amount is invalid
        setSimulatedBridge(null);
        setSimulatedExecute(null);
        setSimulationError("");
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [swapAmount, fromToken, toToken, fromChain, toChain, address]);

  const handleSimulateSwap = async () => {
    if (!swapAmount || parseFloat(swapAmount) <= 0) {
      return;
    }

    if (!address) {
      return;
    }

    setIsSimulating(true);
    setSimulatedBridge(null);
    setSimulatedExecute(null);
    setSimulationError("");

    try {
      const isCrossChain = fromChain !== toChain;
      const tokenConfig = TOKEN_CONFIG[fromToken];
      const decimals = tokenConfig.decimals;
      const amountInBigInt = BigInt(Math.floor(parseFloat(swapAmount) * 10 ** decimals));

      // Step 1: Simulate bridge if cross-chain
      if (isCrossChain) {
        try {
          const bridgeParams = {
            token: fromToken as any,
            amount: parseFloat(swapAmount),
            chainId: toChain,
          };

          const bridgeResult = await simulateBridge(bridgeParams);
          
          if (bridgeResult) {
            setSimulatedBridge(bridgeResult);
          }
        } catch (bridgeError: any) {
          console.error('Bridge simulation error:', bridgeError);
          setSimulationError(`Bridge simulation failed: ${bridgeError.message}`);
          return;
        }
      }

      // Step 2: Simulate execute/swap
      const targetChainId = isCrossChain ? toChain : fromChain;
      const tokenInAddress = TOKEN_CONFIG[fromToken].addresses[targetChainId];
      const tokenOutAddress = TOKEN_CONFIG[toToken].addresses[targetChainId];
      const routerAddress = ROUTER_ADDRESSES[targetChainId];

      if (!tokenInAddress || !tokenOutAddress || !routerAddress) {
        setSimulationError('Token or router not configured for selected chain');
        return;
      }

      try {
        const executeParams = {
          toChainId: targetChainId,
          contractAddress: routerAddress as `0x${string}`,
          contractAbi: MOCK_ROUTER_ABI,
          functionName: 'exactInputSingle',
          buildFunctionParams: (
            token: string,
            amt: string,
            chainId: number,
            userAddress: `0x${string}`
          ) => {
            const minAmountOut = BigInt(1);
            return {
              functionParams: [
                {
                  tokenIn: tokenInAddress as `0x${string}`,
                  tokenOut: tokenOutAddress as `0x${string}`,
                  fee: 3000,
                  recipient: userAddress,
                  amountIn: amountInBigInt,
                  amountOutMinimum: minAmountOut,
                  sqrtPriceLimitX96: BigInt(0),
                },
              ],
            };
          },
          tokenApproval: {
            token: fromToken as any,
            amount: amountInBigInt.toString(),
          },
          waitForReceipt: false,
          requiredConfirmations: 1,
        };

        const executeResult = await simulateExecute(executeParams);
        
        if (executeResult) {
          setSimulatedExecute(executeResult);
        }
      } catch (executeError: any) {
        console.error('Execute simulation error:', executeError);
        setSimulationError(`Swap simulation failed: ${executeError.message}`);
      }
    } catch (error: any) {
      console.error('Simulation error:', error);
      setSimulationError(error.message || 'Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleManualSwap = async () => {
    if (!swapAmount || parseFloat(swapAmount) <= 0) {
      setSwapError('Please enter a valid amount');
      return;
    }

    if (!address) {
      setSwapError('Please connect your wallet');
      return;
    }

    const currentBalance = parseFloat(getCurrentBalance(fromToken, fromChain));
    if (parseFloat(swapAmount) > currentBalance) {
      setSwapError('Insufficient balance');
      return;
    }

    setIsSwapping(true);
    setSwapError('');
    setTxHash('');

    try {
      const isCrossChain = fromChain !== toChain;
      const tokenConfig = TOKEN_CONFIG[fromToken];
      const decimals = tokenConfig.decimals;
      const amountInBigInt = BigInt(Math.floor(parseFloat(swapAmount) * 10 ** decimals));

      if (isCrossChain) {
        console.log('Cross-chain swap: Bridging tokens...');

        const bridgeParams = {
          token: fromToken as any,
          amount: parseFloat(swapAmount),
          chainId: toChain,
        };

        const bridgeResult = await bridge(bridgeParams);

        if (!bridgeResult?.success) {
          throw new Error(bridgeResult?.error || 'Bridge failed');
        }

        console.log('Bridge successful. Now executing swap...');
      }

      // Execute swap
      const targetChainId = isCrossChain ? toChain : fromChain;
      const tokenInAddress = TOKEN_CONFIG[fromToken].addresses[targetChainId];
      const tokenOutAddress = TOKEN_CONFIG[toToken].addresses[targetChainId];
      const routerAddress = ROUTER_ADDRESSES[targetChainId];

      if (!tokenInAddress || !tokenOutAddress || !routerAddress) {
        throw new Error('Token or router not configured for selected chain');
      }

      const executeParams = {
        toChainId: targetChainId,
        contractAddress: routerAddress as `0x${string}`,
        contractAbi: MOCK_ROUTER_ABI,
        functionName: 'exactInputSingle',
        buildFunctionParams: (
          token: string,
          amt: string,
          chainId: number,
          userAddress: `0x${string}`
        ) => {
          const minAmountOut = BigInt(1);
          return {
            functionParams: [
              {
                tokenIn: tokenInAddress as `0x${string}`,
                tokenOut: tokenOutAddress as `0x${string}`,
                fee: 3000,
                recipient: userAddress,
                amountIn: amountInBigInt,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: BigInt(0),
              },
            ],
          };
        },
        tokenApproval: {
          token: fromToken as any,
          amount: amountInBigInt.toString(),
        },
        waitForReceipt: true,
        requiredConfirmations: 1,
      };

      const swapResult = await execute(executeParams);

      if (swapResult?.transactionHash) {
        setTxHash(swapResult.transactionHash);
        setIsComplete(true);
        setTimeout(() => refetch(), 2000);
      } else {
        throw new Error('Swap execution failed - no transaction hash');
      }
    } catch (error: any) {
      console.error('Swap error:', error);
      setSwapError(error.message || 'Swap failed');
    } finally {
      setIsSwapping(false);
    }
  };

  //Calculate swap output
  //   const handleManualSwap = async () => {
  //   if (!swapAmount || parseFloat(swapAmount) <= 0) {
  //     setSwapError('Please enter a valid amount');
  //     return;
  //   }

  //   if (!address) {
  //     setSwapError('Please connect your wallet');
  //     return;
  //   }

  //   setIsSwapping(true);
  //   setSwapError('');
  //   setTxHash('');

  //   try {
  //     const isCrossChain = fromChain !== toChain;

  //     // Get token config
  //     const tokenConfig = TOKEN_CONFIG[fromToken];
  //     const decimals = tokenConfig.decimals;
  //     const amountInBigInt = BigInt(Math.floor(parseFloat(swapAmount) * 10 ** decimals));

  //     if (isCrossChain) {
  //       // Step 1: Bridge tokens to destination chain
  //       console.log('Cross-chain swap detected. Bridging first...');

  //       const bridgeParams = {
  //         token: fromToken as any,
  //         amount: parseFloat(swapAmount),
  //         chainId: toChain,
  //       };

  //       const bridgeResult = await bridge(bridgeParams);

  //       if (!bridgeResult?.success) {
  //         throw new Error('Bridge failed');
  //       }

  //       console.log('Bridge successful, now executing swap on destination chain...');
  //     }

  //     // Step 2: Execute swap (either on same chain or after bridge)
  //     const targetChainId = isCrossChain ? toChain : fromChain;
  //     const tokenInAddress = TOKEN_CONFIG[fromToken].addresses[targetChainId];
  //     const tokenOutAddress = TOKEN_CONFIG[toToken].addresses[targetChainId];
  //     const routerAddress = ROUTER_ADDRESSES[targetChainId];

  //     if (!tokenInAddress || !tokenOutAddress || !routerAddress) {
  //       throw new Error('Token or router not configured for selected chain');
  //     }

  //     const executeParams = {
  //       toChainId: targetChainId as any,
  //       contractAddress: routerAddress as `0x${string}`,
  //       contractAbi: MOCK_ROUTER_ABI,
  //       functionName: 'exactInputSingle',
  //       buildFunctionParams: (
  //         token: string,
  //         amt: string,
  //         chainId: number,
  //         userAddress: `0x${string}`
  //       ) => {
  //         const minAmountOut = BigInt(1);
  //         return {
  //           functionParams: [
  //             {
  //               tokenIn: tokenInAddress as `0x${string}`,
  //               tokenOut: tokenOutAddress as `0x${string}`,
  //               fee: 3000,
  //               recipient: userAddress,
  //               amountIn: amountInBigInt,
  //               amountOutMinimum: minAmountOut,
  //               sqrtPriceLimitX96: BigInt(0),
  //             },
  //           ],
  //         };
  //       },
  //       tokenApproval: {
  //         token: fromToken as any,
  //         amount: amountInBigInt.toString(),
  //       },
  //       waitForReceipt: true,
  //       requiredConfirmations: 1,
  //     };

  //     const swapResult = await execute(executeParams);

  //     if (swapResult?.transactionHash) {
  //       setTxHash(swapResult.transactionHash);
  //       setIsComplete(true);

  //       // Refetch balances after successful swap
  //       setTimeout(() => refetch(), 2000);
  //     }
  //   } catch (error: any) {
  //     console.error('Swap error:', error);
  //     setSwapError(error.message || 'Swap failed');
  //   } finally {
  //     setIsSwapping(false);
  //   }
  // };
  const swapEstimate = swapAmount && parseFloat(swapAmount) > 0 
    ? calculateSwapOutput(fromToken, toToken, swapAmount, 0.5) 
    : null;
  
  const estimatedReceive = swapEstimate?.estimatedOutput || "0.00";
  const exchangeRate = getExchangeRate(fromToken, toToken);

  return (
    <div className="min-h-screen pt-24 pb-12 bg-[#0D0F16] text-white">
      <div className="container mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Portfolio Rebalance</h1>
          <p className="text-white/60">Swap tokens across chains with real-time balance tracking</p>
        </div>

        {!address ? (
          <div className="bg-white/5 rounded-2xl p-12 border border-white/10 text-center">
            <p className="text-white/60 mb-4">Please connect your wallet to continue</p>
          </div>
        ) : isComplete ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 rounded-2xl p-12 border border-white/10 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="inline-block p-6 rounded-full bg-[#00FFAE]/20 mb-6"
            >
              <CheckCircle className="w-16 h-16 text-[#00FFAE]" />
            </motion.div>
            <h2 className="text-3xl font-bold mb-4">Swap Complete!</h2>
            <p className="text-white/70 mb-8 max-w-md mx-auto">
              Successfully swapped {swapAmount} {fromToken} → {estimatedReceive} {toToken}
              {fromChain !== toChain && ` (bridged from ${CHAIN_CONFIG[fromChain].name} to ${CHAIN_CONFIG[toChain].name})`}
            </p>
            {txHash && (
              <p className="text-sm text-white/50 mb-6 break-all">
                Transaction: {txHash}
              </p>
            )}
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => {
                  setIsComplete(false);
                  setSwapAmount('');
                  setTxHash('');
                  setSimulatedBridge(null);
                  setSimulatedExecute(null);
                  refetch();
                }}
                className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white"
              >
                Make Another Swap
              </Button>
            </div>
          </motion.div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-1 mb-8 bg-white/5 border border-white/10">
            <TabsTrigger value="ai-suggested" className="data-[state=active]:bg-[#3B82F6]">
                AI Suggested
              </TabsTrigger>
              <TabsTrigger value="manual-swap" className="data-[state=active]:bg-[#8B5CF6]">
                Token Swap
              </TabsTrigger>
            </TabsList>
           
            <TabsContent value="manual-swap" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 rounded-2xl p-6 border border-white/10 max-w-2xl mx-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl">Token Swap</h2>
                  <div className="flex items-center gap-3">
                    {isSimulating && (
                      <div className="flex items-center gap-2 text-sm text-[#3B82F6]">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Simulating...
                      </div>
                    )}
                    {balancesLoading && (
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </div>
                    )}
                    {!balancesLoading && (
                      <button
                        onClick={() => refetch()}
                        className="text-sm text-[#3B82F6] hover:text-[#2563EB] flex items-center gap-1"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <label className="block text-sm text-white/80">From</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <select
                        value={fromToken}
                        onChange={(e) => setFromToken(e.target.value as TokenSymbol)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white"
                      >
                        {tokens.map((token) => (
                          <option key={token.symbol} value={token.symbol}>
                            {token.symbol} - {token.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-white/40 mt-1">
                        Balance: {balancesLoading ? '...' : getCurrentBalance(fromToken, fromChain)}
                      </p>
                    </div>

                    <div>
                      <select
                        value={fromChain}
                        onChange={(e) => setFromChain(Number(e.target.value) as ChainId)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white"
                      >
                        {chains.map((chain) => (
                          <option key={chain.id} value={chain.id}>
                            {chain.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-white/40 mt-1">Network</p>
                    </div>
                  </div>

                  <input
                    type="number"
                    placeholder="0.00"
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-2xl rounded-lg p-3 h-14 text-white"
                  />

                  {swapAmount && parseFloat(swapAmount) > parseFloat(getCurrentBalance(fromToken, fromChain)) && (
                    <p className="text-sm text-red-400">Insufficient balance</p>
                  )}
                </div>

                <div className="flex justify-center -my-2 relative z-10">
                  <div className="bg-[#1a1f2e] p-3 rounded-full border-2 border-[#8B5CF6]/30">
                    <ArrowUpDown className="w-5 h-5 text-[#8B5CF6]" />
                  </div>
                </div>

                <div className="space-y-4 mt-6 mb-6">
                  <label className="block text-sm text-white/80">To</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <select
                        value={toToken}
                        onChange={(e) => setToToken(e.target.value as TokenSymbol)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white"
                      >
                        {tokens.filter(t => t.symbol !== fromToken).map((token) => (
                          <option key={token.symbol} value={token.symbol}>
                            {token.symbol} - {token.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-white/40 mt-1">
                        Balance: {balancesLoading ? '...' : getCurrentBalance(toToken, toChain)}
                      </p>
                    </div>

                    <div>
                      <select
                        value={toChain}
                        onChange={(e) => setToChain(Number(e.target.value) as ChainId)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white"
                      >
                        {chains.map((chain) => (
                          <option key={chain.id} value={chain.id}>
                            {chain.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-white/40 mt-1">Network</p>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-2xl h-14 flex items-center justify-between text-white">
                    <span>{estimatedReceive !== "0.00" ? `≈ ${parseFloat(estimatedReceive).toFixed(6)}` : "0.00"}</span>
                    <span className="text-white/60 text-lg">{toToken}</span>
                  </div>
                </div>

                {/* Swap Details */}
                <div className="bg-white/5 rounded-lg p-4 space-y-2 mb-6 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Exchange Rate</span>
                    <span>{exchangeRate}</span>
                  </div>
                  {swapEstimate && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-white/60">Minimum Received</span>
                        <span className="text-green-400">
                          {parseFloat(swapEstimate.minimumOutput).toFixed(6)} {toToken}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Price Impact</span>
                        <span className={swapEstimate.priceImpact > 1 ? 'text-yellow-400' : 'text-green-400'}>
                          {swapEstimate.priceImpact.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Swap Fee (0.3%)</span>
                        <span>{parseFloat(swapEstimate.fee).toFixed(6)} {toToken}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-white/60">Slippage Tolerance</span>
                    <span>0.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Route</span>
                    <span className="text-xs">
                      {fromChain === toChain ? "Direct Swap" : "Bridge + Swap"}
                    </span>
                  </div>
                </div>

                {/* Simulation Results */}
                {(simulatedExecute || simulatedBridge) && !simulationError && (
                  <div className="space-y-3 mb-6">
                    {/* Execute Simulation */}
                    {simulatedExecute && (
                      <div className="bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-[#10B981]" />
                          <p className="text-sm font-semibold text-[#10B981]">Swap Simulation Successful</p>
                        </div>
                        {simulatedExecute.intent?.fees && (
                          <div className="space-y-1 text-xs text-white/70">
                            <p>Estimated Gas: {JSON.stringify(simulatedExecute.intent.fees)}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bridge Simulation */}
                    {simulatedBridge && fromChain !== toChain && (
                      <div className="bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-[#3B82F6]" />
                          <p className="text-sm font-semibold text-[#3B82F6]">Bridge Simulation Successful</p>
                        </div>
                        {simulatedBridge.intent?.fees && (
                          <div className="space-y-1 text-xs text-white/70">
                            <p>Bridge Fees: {JSON.stringify(simulatedBridge.intent.fees)}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Simulation Error */}
                {simulationError && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-400 mb-1">Simulation Warning</p>
                      <p className="text-xs text-white/70">{simulationError}</p>
                      <p className="text-xs text-white/50 mt-2">You can still attempt the transaction</p>
                    </div>
                  </div>
                )}

                {/* Cross-chain Info */}
                {fromChain !== toChain && (
                  <div className="bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-lg p-4 mb-6 flex gap-3">
                    <Info className="w-5 h-5 text-[#3B82F6] shrink-0 mt-0.5" />
                    <p className="text-sm text-white/70">
                      Cross-chain swap: Tokens will be bridged from {CHAIN_CONFIG[fromChain].name} to {CHAIN_CONFIG[toChain].name}, then swapped.
                    </p>
                  </div>
                )}

                {/* Swap Error */}
                {swapError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-400 mb-1">Transaction Failed</p>
                      <p className="text-sm text-red-300">{swapError}</p>
                    </div>
                  </div>
                )}

                {/* Swap Button */}
                <button
                  onClick={handleManualSwap}
                  disabled={
                    isSwapping ||
                    bridging ||
                    !swapAmount ||
                    parseFloat(swapAmount) <= 0 ||
                    parseFloat(swapAmount) > parseFloat(getCurrentBalance(fromToken, fromChain)) ||
                    balancesLoading
                  }
                  className="w-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white py-3 rounded-lg font-medium hover:shadow-2xl hover:shadow-[#8B5CF6]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSwapping || bridging ? (
                    <>
                      <RefreshCw className="w-5 h-5 inline mr-2 animate-spin" />
                      {bridging ? 'Bridging...' : 'Swapping...'}
                    </>
                  ) : (
                    `Swap ${fromToken} for ${toToken}`
                  )}
                </button>
              </motion.div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}