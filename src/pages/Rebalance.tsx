import { motion } from "framer-motion";
import { ArrowRight, ArrowUpDown, CheckCircle, Info, RefreshCw, Loader2, AlertCircle, TrendingDown, TrendingUp } from "lucide-react";
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
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import axios, { type AxiosResponse } from "axios";

interface SwapAction {
  src: string;
  dst: string;
  amount: number;
  intent: "BUY" | "SELL";
  min_receive: number | null;
  note: string | null;
}

interface RebalanceResponse {
  ok: boolean;
  current_allocation: Record<string, number>;
  suggested_allocation: Record<string, number>;
  trade_deltas: Record<string, number>;
  swap_plan: {
    base: string;
    sells_to_base: SwapAction[];
    buys_from_base: SwapAction[];
    base_funding: {
      base_balance_start: number;
      wallet_base_available: number;
      from_sells: number;
    };
    base_pool_start: number;
    base_needed_for_buys: number;
    base_delta_target: number;
    base_pool_end: number;
    shortfall: number;
    warnings: string[];
  };
  rationale: string | null;
  error: string | null;
}

// Color palette for different tokens
const TOKEN_COLORS: Record<string, string> = {
  USDT: "#26A17B",
  USDC: "#2775CA",
  DAI: "#F5AC37",
  BUSD: "#F0B90B",
  FDUSD: "#8B5CF6",
  TUSD: "#3B82F6",
  USDP: "#10B981",
  PYUSD: "#EC4899",
  USDD: "#EF4444",
  GUSD: "#06B6D4",
};
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
  const { execute, simulateExecute } = useNexusExecute();

  // Fetch balances using our custom hook
  const { loading: balancesLoading, refetch, getFormattedBalance, balances } = useTokenBalances(address);

  const [isComplete, setIsComplete] = useState(false);
  const [fromToken, setFromToken] = useState<TokenSymbol>("USDC");
  const [toToken, setToToken] = useState<TokenSymbol>("WETH");
  const [fromChain, setFromChain] = useState<ChainId>(11155111);
  const [toChain, setToChain] = useState<ChainId>(11155111);
  const [swapAmount, setSwapAmount] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [swapError, setSwapError] = useState("");
  const [completedSwaps, setCompletedSwaps] = useState<Set<string>>(new Set());

  // Simulation states
  const [simulatedBridge, setSimulatedBridge] = useState<any>(null);
  const [simulatedExecute, setSimulatedExecute] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState("");
  const [isRebalancing, setIsRebalancing] = useState(false);

  // API states
  const [rebalanceData, setRebalanceData] = useState<RebalanceResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  







  console.log('balances:', balances);
  const [activeTab, setActiveTab] = useState("ai-suggested");

  // Convert allocation data to chart format
  const formatChartData = (allocation: Record<string, number>) => {
    return Object.entries(allocation)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100 * 100) / 100,
        color: TOKEN_COLORS[name] || "#94A3B8",
      }))
      .sort((a, b) => b.value - a.value);
  };


  // Calculate changes from swap_plan data
  const calculateChanges = () => {
    if (!rebalanceData) return [];

    const changes: Array<{
      coin: string;
      from: number;
      to: number;
      change: number;
      action: string;
      type: "sell" | "buy" | "none";
      amount?: number;
    }> = [];

    // Process sells
    rebalanceData.swap_plan.sells_to_base.forEach((sell) => {
      const from =
        Math.round(rebalanceData.current_allocation[sell.src] * 100 * 100) /
        100;
      const to =
        Math.round(rebalanceData.suggested_allocation[sell.src] * 100 * 100) /
        100;
      const change = Math.round((to - from) * 100) / 100;

      changes.push({
        coin: sell.src,
        from,
        to,
        change,
        action: `Sell ${sell.amount.toFixed(2)} ${sell.src}`,
        type: "sell",
        amount: sell.amount,
      });
    });

    // Process buys
    rebalanceData.swap_plan.buys_from_base.forEach((buy) => {
      const from =
        Math.round(rebalanceData.current_allocation[buy.dst] * 100 * 100) / 100;
      const to =
        Math.round(rebalanceData.suggested_allocation[buy.dst] * 100 * 100) /
        100;
      const change = Math.round((to - from) * 100) / 100;

      changes.push({
        coin: buy.dst,
        from,
        to,
        change,
        action: `Buy ${buy.amount.toFixed(2)} ${buy.dst}`,
        type: "buy",
        amount: buy.amount,
      });
    });

    // Add tokens with no change
    Object.keys(rebalanceData.current_allocation).forEach((coin) => {
      if (!changes.find((c) => c.coin === coin)) {
        const from =
          Math.round(rebalanceData.current_allocation[coin] * 100 * 100) / 100;
        const to =
          Math.round(rebalanceData.suggested_allocation[coin] * 100 * 100) /
          100;
        changes.push({
          coin,
          from,
          to,
          change: 0,
          action: "No change",
          type: "none",
        });
      }
    });

    // Sort: sells first, then buys, then no change
    return changes.sort((a, b) => {
      if (a.type === "sell" && b.type !== "sell") return -1;
      if (a.type !== "sell" && b.type === "sell") return 1;
      if (a.type === "buy" && b.type === "none") return -1;
      if (a.type === "none" && b.type === "buy") return 1;
      return Math.abs(b.amount || 0) - Math.abs(a.amount || 0);
    });
  };

  type Token = {
    token: string;
    symbol: string;
    name: string;
    balance: string;
    balanceRaw: string;
    decimals: number;
    chainId: number;
    chainName: string;
    address: string;
  };

  type Payload = Record<string, number>;

  function createBalancePayload(balances: Token[]): Payload {
    return balances.reduce((acc, token) => {
      if (token.symbol !== 'WETH') {
        const key = `${token.symbol.toLowerCase()}_balance`;
        acc[key] = parseFloat(token.balance) || 0; // ensures 0 if balance is "0" or invalid
      }
      return acc;

    }, {} as Payload);
  }

  // Single request 
  // without retries
  const fetchRebalancePreview = async (): Promise<void> => {
    const url = "https://ethonline2025.onrender.com/rebalance/preview";

    const payload = createBalancePayload(balances);


    try {
      setIsLoading(true);
      setError(null);
      console.log("🔄 Fetching rebalance preview with payload:", payload);
      const response: AxiosResponse<RebalanceResponse> = await axios.post(
        url,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );

      const data = response.data;

      if (!data.ok) {
        throw new Error(data.error || "Failed to fetch rebalance data");
      }

      console.log("✅ Rebalance Response:", data);
      setRebalanceData(data);
      setError(null);
    } catch (err: any) {
      console.error("❌ Error fetching rebalance preview:", err);

      let errorMessage = "Failed to load rebalance data";

      if (axios.isAxiosError(err)) {
        if (err.code === "ECONNABORTED") {
          errorMessage = "Request timeout. Server took too long to respond.";
        } else if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.response?.status) {
          errorMessage = `Server error (${err.response.status})`;
        } else if (err.request) {
          errorMessage =
            "No response from server. Please check your connection.";
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRebalancePreview();
  }, []);

  const handleRebalance = () => {
    setIsRebalancing(true);
    setTimeout(() => {
      setIsRebalancing(false);
      setIsComplete(true);
    }, 3000);
  };

  // const handleManualSwap = () => {
  //   setIsSwapping(true);
  //   setTimeout(() => {
  //     setIsSwapping(false);
  //     setIsComplete(true);
  //   }, 3000);
  // };

  const handleRetry = () => {
    fetchRebalancePreview();
  };

  const estimatedReceive = swapAmount
    ? (parseFloat(swapAmount) * 0.999).toFixed(2)
    : "0.00";
  // const gasEstimate = fromChain === "Ethereum" ? "$12.50" : "$0.50";

  const currentData = rebalanceData
    ? formatChartData(rebalanceData.current_allocation)
    : [];
  const suggestedData = rebalanceData
    ? formatChartData(rebalanceData.suggested_allocation)
    : [];
  const changes = calculateChanges();

  // Calculate stability scores
  const calculateStability = (allocation: Record<string, number>) => {
    const values = Object.values(allocation);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);
    return Math.max(0, Math.min(100, Math.round((1 - stdDev * 10) * 100)));
  };

  const currentStability = rebalanceData
    ? calculateStability(rebalanceData.current_allocation)
    : 0;
  const suggestedStability = rebalanceData
    ? calculateStability(rebalanceData.suggested_allocation)
    : 0;


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
            _token: string,
            _amt: string,
            _chainId: number,
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
    const swapKey = `${fromToken}-${toToken}-${swapAmount}`;
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
          _token: string,
          _amt: string,
          _chainId: number,
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
        setCompletedSwaps(prev => new Set(prev).add(swapKey));
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
  //   const calculatePortfolioData = () => {
  //   if (!address || balancesLoading) return { current: [], suggested: [], changes: [], totalValue: 0 };

  //   // Get all balances across all chains for each token
  //   const tokenValues: Record<TokenSymbol, number> = {} as any;
  //   let totalValue = 0;

  //   tokens.forEach(({ symbol }) => {
  //     let tokenTotal = 0;
  //     chains.forEach(({ id }) => {
  //       const balance = parseFloat(getFormattedBalance(symbol, id, TOKEN_CONFIG[symbol].decimals));
  //       tokenTotal += balance;
  //     });
  //     tokenValues[symbol] = tokenTotal;
  //     totalValue += tokenTotal;
  //   });

  //   // Calculate current allocation percentages
  //   const currentData = tokens.map(({ symbol, name }) => {
  //     const value = totalValue > 0 ? (tokenValues[symbol] / totalValue) * 100 : 0;
  //     return {
  //       name: symbol,
  //       fullName: name,
  //       value: parseFloat(value.toFixed(2)),
  //       balance: tokenValues[symbol].toFixed(4),
  //       color: symbol === 'USDC' ? '#3B82F6' : symbol === 'USDT' ? '#10B981' : symbol === 'WETH' ? '#8B5CF6' : '#F59E0B'
  //     };
  //   }).filter(item => item.value > 0);

  //   // Calculate suggested allocation (example: balanced portfolio with risk consideration)
  //   const suggestedAllocation: Record<TokenSymbol, number> = {
  //     'USDC': 40, // Stable
  //     'USDT': 30, // Stable
  //     'WETH': 15, // Growth
  //     'DAI': 5,   // Reserve
  //     'FDUSD': 2, // Additional stables
  //     'BUSD': 2,
  //     'TUSD': 1,
  //     'USDP': 1,
  //     'PYUSD': 1,
  //     'USDD': 2,
  //     'GUSD': 1
  //   };

  //   const suggestedData = tokens.map(({ symbol, name }) => ({
  //     name: symbol,
  //     fullName: name,
  //     value: suggestedAllocation[symbol] || 0,
  //     targetBalance: ((suggestedAllocation[symbol] || 0) / 100 * totalValue).toFixed(4),
  //     color: symbol === 'USDC' ? '#3B82F6' : symbol === 'USDT' ? '#10B981' : symbol === 'WETH' ? '#8B5CF6' : '#F59E0B'
  //   })).filter(item => item.value > 0);

  //   // Calculate changes needed
  //   const changes = tokens.map(({ symbol }) => {
  //     const current = currentData.find(d => d.name === symbol)?.value || 0;
  //     const suggested = suggestedAllocation[symbol] || 0;
  //     const change = parseFloat((suggested - current).toFixed(2));
  //     const currentBalance = tokenValues[symbol];
  //     const targetBalance = (suggested / 100) * totalValue;
  //     const amountChange = targetBalance - currentBalance;

  //     return {
  //       coin: symbol,
  //       from: current.toFixed(2),
  //       to: suggested.toFixed(2),
  //       change,
  //       action: change === 0 ? 'Hold' : change > 0 ? `Buy ${Math.abs(amountChange).toFixed(4)} ${symbol}` : `Sell ${Math.abs(amountChange).toFixed(4)} ${symbol}`,
  //       amountChange: amountChange.toFixed(4)
  //     };
  //   }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  //   // Calculate stability scores
  //   const currentStability = calculateStabilityScore(currentData.map(d => d.value));
  //   const suggestedStability = calculateStabilityScore(suggestedData.map(d => d.value));

  //   return {
  //     current: currentData,
  //     suggested: suggestedData,
  //     changes,
  //     totalValue: totalValue.toFixed(2),
  //     currentStability,
  //     suggestedStability,
  //     stabilityImprovement: (Number(suggestedStability) - Number(currentStability)).toFixed(1)
  //   };
  // };

  // Calculate stability score (0-100) - higher is more stable
  // const calculateStabilityScore = (allocations: number[]) => {
  //   // Calculate variance from ideal balanced portfolio
  //   const idealAllocation = 100 / allocations.length;
  //   const variance = allocations.reduce((sum, alloc) => {
  //     return sum + Math.pow(alloc - idealAllocation, 2);
  //   }, 0) / allocations.length;

  //   // Convert to 0-100 scale (lower variance = higher stability)
  //   const maxVariance = Math.pow(100, 2); // Max possible variance
  //   const stabilityScore = 100 - (variance / maxVariance) * 100;
  //   return Math.max(0, Math.min(100, stabilityScore)).toFixed(0);
  // };

  // const portfolioData = calculatePortfolioData();

  const swapEstimate = swapAmount && parseFloat(swapAmount) > 0
    ? calculateSwapOutput(fromToken, toToken, swapAmount, 0.5)
    : null;

  // const estimatedReceive = swapEstimate?.estimatedOutput || "0.00";
  const exchangeRate = getExchangeRate(fromToken, toToken);

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-['Space_Grotesk'] mb-2">
            Portfolio Rebalance
          </h1>
          <p className="text-white/60">
            Optimize your stablecoin allocation for maximum stability
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-2xl p-12 border-glow text-center"
          >
            <div className="inline-block p-6 rounded-full bg-[#3B82F6]/20 mb-6">
              <RefreshCw className="w-12 h-12 text-[#3B82F6] animate-spin" />
            </div>
            <h2 className="text-2xl font-['Space_Grotesk'] mb-2">
              Loading Rebalance Data
            </h2>
            <p className="text-white/60">Fetching optimal allocation...</p>
          </motion.div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-8 border-glow border-red-500/30"
          >
            <div className="flex flex-col items-center text-center">
              <div className="p-4 rounded-full bg-red-500/20 mb-4">
                <AlertCircle className="w-12 h-12 text-red-500" />
              </div>
              <h2 className="text-2xl font-['Space_Grotesk'] mb-2">
                Unable to Load Data
              </h2>
              <p className="text-white/70 mb-6 max-w-md">{error}</p>
              <Button
                onClick={handleRetry}
                className="bg-linear-to-r from-[#3B82F6] to-[#8B5CF6] text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </motion.div>
        )}

        {/* Success/Main Content */}
        {!isLoading && !error && rebalanceData && (
          <>
            {isComplete ? (
              /* Success State */
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass rounded-2xl p-12 border-glow text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="inline-block p-6 rounded-full bg-[#00FFAE]/20 mb-6 glow-green"
                >
                  <CheckCircle className="w-16 h-16 text-[#00FFAE]" />
                </motion.div>
                <h2 className="text-3xl font-['Space_Grotesk'] mb-4">
                  Rebalance Complete!
                </h2>
                <p className="text-white/70 mb-8 max-w-md mx-auto">
                  Your portfolio has been successfully optimized for maximum
                  stability.
                </p>

                {txHash && (
                  <div className="mb-4">
                    <p className="text-sm text-white/60">Transaction Hash</p>
                    <p className="text-xs text-white/80 break-all">{txHash}</p>
                  </div>
                )}

                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => setIsComplete(false)}
                    className="border-[#00FFFF] text-[#00FFFF] hover:bg-[#00FFFF]/10"
                  >
                    View Portfolio
                  </Button>
                  <Button
                    onClick={() => setIsComplete(false)}
                    className="bg-linear-to-r from-[#00FFFF] to-[#00FFAE] text-[#0D0F16]"
                  >
                    Done
                  </Button>
                </div>
              </motion.div>
            ) : (
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8 bg-white/5 border border-white/10">
                  <TabsTrigger
                    value="ai-suggested"
                    className="data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white"
                  >
                    AI Suggested
                  </TabsTrigger>
                  <TabsTrigger
                    value="manual-swap"
                    className="data-[state=active]:bg-[#8B5CF6] data-[state=active]:text-white"
                  >
                    Manual Swap
                  </TabsTrigger>
                </TabsList>

                {/* AI Suggested Rebalance Tab */}
                <TabsContent value="ai-suggested" className="space-y-6">
                  {/* Comparison View */}
                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* Current Portfolio */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="glass rounded-2xl p-6 border-glow"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl">Current Allocation</h2>
                        <span className="px-3 py-1 rounded-full bg-white/10 text-sm text-white/60">
                          Stability: {currentStability}%
                        </span>
                      </div>

                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={currentData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {currentData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(13, 15, 22, 0.95)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "8px",
                            }}
                            formatter={(value: any) => [
                              `${value}%`,
                              "Allocation",
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="space-y-2 mt-4 max-h-60 overflow-y-auto">
                        {currentData.map((item) => (
                          <div
                            key={item.name}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-sm text-white/70">
                                {item.name}
                              </span>
                            </div>
                            <span className="text-sm">
                              {item.value.toFixed(2)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>

                    {/* Suggested Portfolio */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="glass rounded-2xl p-6 border-glow relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl">Suggested Allocation</h2>
                        <span className="px-3 py-1 rounded-full bg-[#8B5CF6]/20 text-sm text-[#8B5CF6] border border-[#8B5CF6]/30">
                          Stability: {suggestedStability}%
                        </span>
                      </div>

                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={suggestedData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {suggestedData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(13, 15, 22, 0.95)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "8px",
                            }}
                            formatter={(value: any) => [
                              `${value}%`,
                              "Allocation",
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="space-y-2 mt-4 max-h-60 overflow-y-auto">
                        {suggestedData.map((item) => (
                          <div
                            key={item.name}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-sm text-white/70">
                                {item.name}
                              </span>
                            </div>
                            <span className="text-sm">
                              {item.value.toFixed(2)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>

                  {/* AI Rationale */}
                  {rebalanceData.rationale && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="glass rounded-2xl p-6 border-glow"
                    >
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-[#3B82F6] shrink-0 mt-0.5" />
                        <div>
                          <h3 className="text-sm font-semibold mb-1 text-[#3B82F6]">
                            AI Analysis
                          </h3>
                          <p className="text-sm text-white/70">
                            {rebalanceData.rationale}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}


                  {/* Changes Summary */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass rounded-2xl p-6 border-glow"
                  >
                    <h2 className="text-xl mb-6">Rebalance Actions</h2>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {changes.map((change, index) => (
                        <motion.div
                          key={`${change.coin}-${index}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + index * 0.05 }}
                          className={`flex items-center justify-between p-4 rounded-lg border ${change.type === "sell"
                              ? "bg-red-500/5 border-red-500/20"
                              : change.type === "buy"
                                ? "bg-green-500/5 border-green-500/20"
                                : "bg-white/5 border-white/10"
                            }`}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            {/* Token Icon */}
                            <div className="relative">
                              <div
                                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
                                style={{
                                  backgroundColor:
                                    TOKEN_COLORS[change.coin] || "#94A3B8",
                                }}
                              >
                                <span className="text-white drop-shadow-lg">
                                  {change.coin.charAt(0)}
                                </span>
                              </div>
                              {change.type === "sell" && (
                                <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1">
                                  <TrendingDown className="w-3 h-3 text-white" />
                                </div>
                              )}
                              {change.type === "buy" && (
                                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                                  <TrendingUp className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-white font-bold text-base">
                                  {change.coin}
                                </span>
                                <span
                                  className={`text-sm ${change.type === "sell"
                                      ? "text-red-400"
                                      : change.type === "buy"
                                        ? "text-green-400"
                                        : "text-white/60"
                                    }`}
                                >
                                  •
                                </span>
                                <span
                                  className={`text-base font-medium ${change.type === "sell"
                                      ? "text-red-400"
                                      : change.type === "buy"
                                        ? "text-green-400"
                                        : "text-white/70"
                                    }`}
                                >
                                  {change.action}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-white/50">
                                <span>{change.from.toFixed(2)}%</span>
                                {change.change !== 0 && (
                                  <>
                                    <ArrowRight className="w-3 h-3" />
                                    <span className="text-white/70">
                                      {change.to.toFixed(2)}%
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-3">
                            {/* Change Badge */}
                            {change.type !== "none" && (
                              <div
                                className={`px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap ${change.type === "buy"
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-red-500/20 text-red-400"
                                  }`}
                              >
                                {change.change > 0 ? "+" : ""}
                                {change.change.toFixed(2)}%
                              </div>
                            )}

                            {/* Swap Button */}
                            {/* {change.type !== "none" && change.amount && (
                              <Button
                                onClick={() => {
                                  // Get the swap action from rebalanceData
                                  const swapAction = change.type === "sell"
                                    ? rebalanceData?.swap_plan.sells_to_base.find(s => s.src === change.coin)
                                    : rebalanceData?.swap_plan.buys_from_base.find(b => b.dst === change.coin);
                                  
                                  if (swapAction) {
                                    // For BUY intent: swap from base to destination
                                    // For SELL intent: swap from source to base
                                    const isBuyIntent = swapAction.intent === "BUY";
                                    
                                    setFromToken(isBuyIntent ? (rebalanceData?.swap_plan.base as TokenSymbol || "USDC") : (change.coin as TokenSymbol));
                                    setToToken(isBuyIntent ? (change.coin as TokenSymbol) : (rebalanceData?.swap_plan.base as TokenSymbol || "USDC"));
                                    setFromChain(11155111); // Default chain
                                    setToChain(11155111); // Default chain
                                    setSwapAmount(change.amount !== undefined ? change.amount.toString() : "0");
                                    
                                    // Switch to manual swap tab
                                    setActiveTab("manual-swap");
                                    
                                    // Scroll to swap section
                                    setTimeout(() => {
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }, 100);
                                  }
                                }}
                                className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-4 py-2 text-sm"
                                disabled={isSwapping || bridging}
                              >
                                Swap
                              </Button>
                            )} */}
                            {change.type !== "none" && change.amount && (
                              <Button
                                onClick={() => {
                                  const swapAction = change.type === "sell"
                                    ? rebalanceData?.swap_plan.sells_to_base.find(s => s.src === change.coin)
                                    : rebalanceData?.swap_plan.buys_from_base.find(b => b.dst === change.coin);

                                  if (swapAction) {
                                    const isBuyIntent = swapAction.intent === "BUY";

                                    setFromToken(isBuyIntent ? (rebalanceData?.swap_plan.base as TokenSymbol || "USDC") : (change.coin as TokenSymbol));
                                    setToToken(isBuyIntent ? (change.coin as TokenSymbol) : (rebalanceData?.swap_plan.base as TokenSymbol || "USDC"));
                                    setFromChain(11155111);
                                    setToChain(11155111);
                                    setSwapAmount((change.amount ?? 0).toString());

                                    setActiveTab("manual-swap");

                                    setTimeout(() => {
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }, 100);
                                  }
                                }}
                                className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={
                                  isSwapping ||
                                  bridging ||
                                  completedSwaps.has(
                                    change.type === "sell"
                                      ? `${change.coin}-${rebalanceData?.swap_plan.base}-${change.amount}`
                                      : `${rebalanceData?.swap_plan.base}-${change.coin}-${change.amount}`
                                  )
                                }
                              >
                                {completedSwaps.has(
                                  change.type === "sell"
                                    ? `${change.coin}-${rebalanceData?.swap_plan.base}-${change.amount}`
                                    : `${rebalanceData?.swap_plan.base}-${change.coin}-${change.amount}`
                                ) ? (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Done
                                  </>
                                ) : (
                                  "Swap"
                                )}
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                  {/* Swap Plan Summary */}
                  {rebalanceData.swap_plan && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="glass rounded-2xl p-6 border-glow"
                    >
                      <h3 className="text-lg mb-4">Swap Execution Plan</h3>
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div className="bg-white/5 rounded-lg p-4">
                          <p className="text-white/60 mb-1">Base Token</p>
                          <p className="text-xl font-semibold text-[#2775CA]">
                            {rebalanceData.swap_plan.base}
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4">
                          <p className="text-white/60 mb-1">Total Sells</p>
                          <p className="text-xl font-semibold text-[#EF4444]">
                            {rebalanceData.swap_plan.sells_to_base.length}{" "}
                            tokens
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4">
                          <p className="text-white/60 mb-1">Total Buys</p>
                          <p className="text-xl font-semibold text-[#10B981]">
                            {rebalanceData.swap_plan.buys_from_base.length}{" "}
                            tokens
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Action Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="glass rounded-2xl p-8 border-glow text-center"
                  >
                    <div className="mb-6">
                      <h3 className="text-xl mb-2">Ready to Optimize?</h3>
                      <p className="text-white/60">
                        This rebalance will improve your portfolio stability by{" "}
                        {suggestedStability - currentStability}% and reduce
                        depeg risk.
                      </p>
                    </div>

                    <div className="flex gap-4 justify-center items-center">
                      <Button
                        className="border-white/20 hover:bg-white/5"
                        disabled={isRebalancing}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleRebalance}
                        disabled={isRebalancing}
                        className="bg-linear-to-r from-[#3B82F6] to-[#8B5CF6] text-white hover:shadow-2xl hover:shadow-[#3B82F6]/50 transition-all glow-blue"
                      >
                        {isRebalancing ? (
                          <>
                            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                            Rebalancing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-5 h-5 mr-2" />
                            Rebalance Now
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="mt-6 p-4 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30">
                      <p className="text-sm text-white/70">
                        <span className="text-[#3B82F6]">Estimated Gas:</span>{" "}
                        $2.50 •
                        <span className="text-[#8B5CF6]"> Slippage:</span> 0.1%
                        •<span className="text-white/50"> Time:</span> ~30
                        seconds
                      </p>
                    </div>
                  </motion.div>
                </TabsContent>

                {/* Manual Swap Tab */}
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
                      className="w-full bg-linear-to-r from-[#3B82F6] to-[#8B5CF6] text-white py-3 rounded-lg font-medium hover:shadow-2xl hover:shadow-[#8B5CF6]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
          </>
        )}
      </div>
    </div>
  );
}