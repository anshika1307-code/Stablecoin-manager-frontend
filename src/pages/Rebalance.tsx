import { motion } from "framer-motion";
import { ArrowRight, ArrowUpDown, CheckCircle, Info, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { TabsContent, TabsList, TabsTrigger, Tabs } from "../components/ui/tabs";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";

export function RebalancePage() {
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const [fromToken, setFromToken] = useState("USDT");
  const [toToken, setToToken] = useState("USDC");
  const [fromChain, setFromChain] = useState("Ethereum");
  const [toChain, setToChain] = useState("Ethereum");
  const [swapAmount, setSwapAmount] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const gasEstimateUSD = 1.25; // Example gas fee in USD
  const tokenPriceUSD = 1.00;  // Price per token in USD

  const currentData = [
    { name: "USDT", value: 50, color: "#26A17B" },
    { name: "USDC", value: 30, color: "#2775CA" },
    { name: "DAI", value: 15, color: "#F5AC37" },
    { name: "FDUSD", value: 5, color: "#8B5CF6" },
  ];

  const suggestedData = [
    { name: "USDT", value: 40, color: "#26A17B" },
    { name: "USDC", value: 40, color: "#2775CA" },
    { name: "DAI", value: 15, color: "#F5AC37" },
    { name: "FDUSD", value: 5, color: "#8B5CF6" },
  ];

  const changes = [
    { coin: "USDT", from: 50, to: 40, change: -10, action: "Sell 10 USDT" },
    { coin: "USDC", from: 30, to: 40, change: +10, action: "Buy 10 USDC" },
    { coin: "DAI", from: 15, to: 15, change: 0, action: "No change" },
    { coin: "FDUSD", from: 5, to: 5, change: 0, action: "No change" },
  ];


  const tokens = [
    { symbol: "USDT", name: "Tether USD", balance: "45,202.50" },
    { symbol: "USDC", name: "USD Coin", balance: "30,135.00" },
  ];

  const chains = ["Ethereum", "Polygon", "Arbitrum", "Optimism", "Base", "BSC"];

  const [activeTab, setActiveTab] = useState("ai-suggested");
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
  const estimatedReceive = swapAmount ? (parseFloat(swapAmount) * 0.999).toFixed(2) : "0.00";
  const gasEstimate = fromChain === "Ethereum" ? "$12.50" : "$0.50";


  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-['Space_Grotesk'] mb-2">Portfolio Rebalance</h1>
          <p className="text-white/60">Optimize your stablecoin allocation for maximum stability</p>
        </div>

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
            <h2 className="text-3xl font-['Space_Grotesk'] mb-4">Rebalance Complete!</h2>
            <p className="text-white/70 mb-8 max-w-md mx-auto">
              Successfully swapped 10 USDT → 10 USDC. Your portfolio is now optimized.
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8 bg-white/5 border border-white/10">
              <TabsTrigger value="ai-suggested" className="data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white">
                AI Suggested
              </TabsTrigger>
              <TabsTrigger value="manual-swap" className="data-[state=active]:bg-[#8B5CF6] data-[state=active]:text-white">
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
                      Stability: 89%
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
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="space-y-2 mt-4">
                    {currentData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm text-white/70">{item.name}</span>
                        </div>
                        <span className="text-sm">{item.value}%</span>
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
                  {/* <div className="absolute top-0 right-0 px-4 py-2 bg-gradient-to-l from-[#8B5CF6] to-transparent">
                    <span className="text-xs text-white">Recommended</span>
                  </div> */}

                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl">Suggested Allocation</h2>
                    <span className="px-3 py-1 rounded-full bg-[#8B5CF6]/20 text-sm text-[#8B5CF6] border border-[#8B5CF6]/30">
                      Stability: 94%
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
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="space-y-2 mt-4">
                    {suggestedData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm text-white/70">{item.name}</span>
                        </div>
                        <span className="text-sm">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Changes Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass rounded-2xl p-6 border-glow"
              >
                <h2 className="text-xl mb-6">Rebalance Actions</h2>

                <div className="space-y-3">
                  {changes.map((change, index) => (
                    <motion.div
                      key={change.coin}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className={`flex items-center justify-between p-4 rounded-lg ${change.change !== 0 ? "bg-white/5" : "bg-white/0"
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{
                            background: `${currentData.find((d) => d.name === change.coin)?.color
                              }20`,
                          }}
                        >
                          <span
                            style={{
                              color: currentData.find((d) => d.name === change.coin)?.color,
                            }}
                          >
                            {change.coin}
                          </span>
                        </div>

                        <div>
                          <div className="mb-1">{change.action}</div>
                          <div className="flex items-center gap-2 text-sm text-white/60">
                            <span>{change.from}%</span>
                            {change.change !== 0 && (
                              <>
                                <ArrowRight className="w-3 h-3" />
                                <span>{change.to}%</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {change.change !== 0 && (
                        <div
                          className={`px-3 py-1 rounded-full text-sm ${change.change > 0
                            ? "bg-[#8B5CF6]/20 text-[#8B5CF6]"
                            : "bg-[#EF4444]/20 text-[#EF4444]"
                            }`}
                        >
                          {change.change > 0 ? "+" : ""}
                          {change.change}%
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>

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
                    This rebalance will improve your portfolio stability by 5% and reduce depeg risk.
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
                    <span className="text-[#3B82F6]">Estimated Gas:</span> $2.50 •
                    <span className="text-[#8B5CF6]"> Slippage:</span> 0.1% •
                    <span className="text-white/50"> Time:</span> ~30 seconds
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
                  <label className="block text-sm text-white/80">From</label>
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
                        Balance: {tokens.find((t) => t.symbol === fromToken)?.balance ?? "0"}
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
                        Balance: {tokens.find((t) => t.symbol === toToken)?.balance ?? "0"}
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
                    {estimatedReceive ? `${estimatedReceive} ${toToken}` : "0.00"}
                  </div>
                </div>

                {/* Swap Details */}
                <div className="bg-white/5 rounded-lg p-4 space-y-2 mb-6 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Exchange Rate</span>
                    <span>1 {fromToken} = 0.999 {toToken}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Estimated Gas Fee</span>
                    <span className="text-[#3B82F6]">{gasEstimate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Slippage Tolerance</span>
                    <span>0.5%</span>
                  </div>
                </div>

              </motion.div>

            </TabsContent>




          </Tabs>
        )}
      </div>
    </div>
  );
}
