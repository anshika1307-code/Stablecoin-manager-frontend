import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpDown,
  CheckCircle,
  Info,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useEffect, useState } from "react";
import {
  TabsContent,
  TabsList,
  TabsTrigger,
  Tabs,
} from "../components/ui/tabs";
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

export function RebalancePage() {
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // API states
  const [rebalanceData, setRebalanceData] = useState<RebalanceResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fromToken, setFromToken] = useState("USDT");
  const [toToken, setToToken] = useState("USDC");
  const [fromChain, setFromChain] = useState("Ethereum");
  const [toChain, setToChain] = useState("Ethereum");
  const [swapAmount, setSwapAmount] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const gasEstimateUSD = 1.25;
  const tokenPriceUSD = 1.0;

  const tokens = [
    { symbol: "USDT", name: "Tether USD", balance: "45,202.50" },
    { symbol: "USDC", name: "USD Coin", balance: "30,135.00" },
  ];

  const chains = ["Ethereum", "Polygon", "Arbitrum", "Optimism", "Base", "BSC"];
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

  // Single request without retries
  const fetchRebalancePreview = async (): Promise<void> => {
    const url = "https://ethonline2025.onrender.com/rebalance/preview";

    const payload = {
      usdc_balance: 1200,
      usdt_balance: 800,
      dai_balance: 500,
      fdusd_balance: 300,
      busd_balance: 250,
      tusd_balance: 150,
      usdp_balance: 200,
      pyusd_balance: 100,
      usdd_balance: 400,
      gusd_balance: 100,
      quote_amount: 1000,
    };

    try {
      setIsLoading(true);
      setError(null);

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

  const handleManualSwap = () => {
    setIsSwapping(true);
    setTimeout(() => {
      setIsSwapping(false);
      setIsComplete(true);
    }, 3000);
  };

  const handleRetry = () => {
    fetchRebalancePreview();
  };

  const estimatedReceive = swapAmount
    ? (parseFloat(swapAmount) * 0.999).toFixed(2)
    : "0.00";
  const gasEstimate = fromChain === "Ethereum" ? "$12.50" : "$0.50";

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
                className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white"
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
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => setIsComplete(false)}
                    className="border-[#00FFFF] text-[#00FFFF] hover:bg-[#00FFFF]/10"
                  >
                    View Portfolio
                  </Button>
                  <Button
                    onClick={() => setIsComplete(false)}
                    className="bg-gradient-to-r from-[#00FFFF] to-[#00FFAE] text-[#0D0F16]"
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
                          className={`flex items-center justify-between p-4 rounded-lg border ${
                            change.type === "sell"
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
                                  className={`text-sm ${
                                    change.type === "sell"
                                      ? "text-red-400"
                                      : change.type === "buy"
                                      ? "text-green-400"
                                      : "text-white/60"
                                  }`}
                                >
                                  •
                                </span>
                                <span
                                  className={`text-base font-medium ${
                                    change.type === "sell"
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

                          {/* Change Badge */}
                          {change.type !== "none" && (
                            <div
                              className={`px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap ${
                                change.type === "buy"
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {change.change > 0 ? "+" : ""}
                              {change.change.toFixed(2)}%
                            </div>
                          )}
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
                        className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white hover:shadow-2xl hover:shadow-[#3B82F6]/50 transition-all glow-blue"
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
                    <h2 className="text-xl mb-6">Manual Token Swap</h2>

                    {/* From Token Section */}
                    <div className="space-y-4 mb-6">
                      <label className="block text-sm text-white/80">
                        From
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <select
                            value={fromToken}
                            onChange={(e) => setFromToken(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white"
                          >
                            <option value="">Select Token</option>
                            {tokens.map((token) => (
                              <option key={token.symbol} value={token.symbol}>
                                {token.symbol} - {token.name}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-white/40 mt-1">
                            Balance:{" "}
                            {tokens.find((t) => t.symbol === fromToken)
                              ?.balance ?? "0"}
                          </p>
                        </div>

                        <div>
                          <select
                            value={fromChain}
                            onChange={(e) => setFromChain(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white"
                          >
                            <option value="">Select Network</option>
                            {chains.map((chain) => (
                              <option key={chain} value={chain}>
                                {chain}
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
                    </div>
                    {/* Swap Icon */}
                    <div className="flex justify-center -my-2 relative z-10">
                      <div className="bg-[#1a1f2e] p-3 rounded-full border-2 border-[#8B5CF6]/30">
                        <ArrowUpDown className="w-5 h-5 text-[#8B5CF6]" />
                      </div>
                    </div>

                    {/* To Token Section */}
                    <div className="space-y-4 mt-6 mb-6">
                      <label className="block text-sm text-white/80">To</label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <select
                            value={toToken}
                            onChange={(e) => setToToken(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white"
                          >
                            <option value="">Select Token</option>
                            {tokens.map((token) => (
                              <option key={token.symbol} value={token.symbol}>
                                {token.symbol} - {token.name}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-white/40 mt-1">
                            Balance:{" "}
                            {tokens.find((t) => t.symbol === toToken)
                              ?.balance ?? "0"}
                          </p>
                        </div>

                        <div>
                          <select
                            value={toChain}
                            onChange={(e) => setToChain(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white"
                          >
                            <option value="">Select Network</option>
                            {chains.map((chain) => (
                              <option key={chain} value={chain}>
                                {chain}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-white/40 mt-1">Network</p>
                        </div>
                      </div>

                      <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-2xl h-14 flex items-center text-white/60">
                        {estimatedReceive
                          ? `${estimatedReceive} ${toToken}`
                          : "0.00"}
                      </div>
                    </div>

                    {/* Swap Details */}
                    <div className="bg-white/5 rounded-lg p-4 space-y-2 mb-6 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">Exchange Rate</span>
                        <span>
                          1 {fromToken} = 0.999 {toToken}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Estimated Gas Fee</span>
                        <span className="text-[#3B82F6]">{gasEstimate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">
                          Slippage Tolerance
                        </span>
                        <span>0.5%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Route</span>
                        <span className="text-xs">
                          {fromChain === toChain
                            ? "Direct Swap"
                            : "Bridge + Swap"}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
                        <span className="text-white/60">
                          You’ll Receive (After Gas)
                        </span>
                        <span>
                          {(
                            Number(estimatedReceive) -
                            (gasEstimateUSD / tokenPriceUSD || 0)
                          ).toFixed(6)}{" "}
                          {toToken}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-white/60">≈ In USD</span>
                        <span>
                          $
                          {(
                            (Number(estimatedReceive) -
                              (gasEstimateUSD / tokenPriceUSD || 0)) *
                            tokenPriceUSD
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {/* Info Box */}
                    {fromChain !== toChain && (
                      <div className="bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-lg p-4 mb-6 flex gap-3">
                        <Info className="w-5 h-5 text-[#3B82F6] shrink-0 mt-0.5" />
                        <p className="text-sm text-white/70">
                          Cross-chain swap detected. Your tokens will be bridged
                          from {fromChain} to {toChain} and swapped in one
                          transaction.
                        </p>
                      </div>
                    )}
                    <button
                      onClick={handleManualSwap}
                      disabled={
                        isSwapping || !swapAmount || parseFloat(swapAmount) <= 0
                      }
                      className="w-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white py-3 rounded-lg font-medium hover:shadow-2xl hover:shadow-[#8B5CF6]/50 transition-all disabled:opacity-50"
                    >
                      {isSwapping
                        ? "Swapping..."
                        : `Swap ${fromToken} for ${toToken}`}
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
