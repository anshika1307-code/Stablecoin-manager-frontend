import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useState } from "react";

export function RebalancePage() {
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

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

  const handleRebalance = () => {
    setIsRebalancing(true);
    setTimeout(() => {
      setIsRebalancing(false);
      setIsComplete(true);
    }, 3000);
  };

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
          <>
            {/* Comparison View */}
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              {/* Current Portfolio */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass rounded-2xl p-6 border-glow"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-['Space_Grotesk']">Current Allocation</h2>
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
                      <span className="text-sm font-['Space_Grotesk']">{item.value}%</span>
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
                <div className="absolute top-0 right-0 px-4 py-2 bg-gradient-to-l from-[#00FFAE] to-transparent">
                  <span className="text-xs text-[#0D0F16]">Recommended</span>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-['Space_Grotesk']">Suggested Allocation</h2>
                  <span className="px-3 py-1 rounded-full bg-[#00FFAE]/20 text-sm text-[#00FFAE] border border-[#00FFAE]/30">
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
                      <span className="text-sm font-['Space_Grotesk']">{item.value}%</span>
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
              className="glass rounded-2xl p-6 border-glow mb-6"
            >
              <h2 className="text-xl font-['Space_Grotesk'] mb-6">Rebalance Actions</h2>

              <div className="space-y-3">
                {changes.map((change, index) => (
                  <motion.div
                    key={change.coin}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      change.change !== 0 ? "bg-white/5" : "bg-white/0"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                          background: `${
                            currentData.find((d) => d.name === change.coin)?.color
                          }20`,
                        }}
                      >
                        <span
                          className="font-['Space_Grotesk']"
                          style={{
                            color: currentData.find((d) => d.name === change.coin)?.color,
                          }}
                        >
                          {change.coin}
                        </span>
                      </div>

                      <div>
                        <div className="font-['Space_Grotesk'] mb-1">{change.action}</div>
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
                        className={`px-3 py-1 rounded-full text-sm ${
                          change.change > 0
                            ? "bg-[#00FFAE]/20 text-[#00FFAE]"
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
                <h3 className="text-xl font-['Space_Grotesk'] mb-2">Ready to Optimize?</h3>
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
                  className="bg-gradient-to-r from-[#00FFFF] to-[#00FFAE] text-[#0D0F16] hover:shadow-2xl hover:shadow-[#00FFFF]/50 transition-all relative"
                >
                  {isRebalancing ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      Rebalancing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2" />
                      Rebalance via Nexus
                    </>
                  )}
                </Button>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-[#00FFFF]/10 border border-[#00FFFF]/30">
                <p className="text-sm text-white/70">
                  <span className="text-[#00FFFF]">Estimated Gas:</span> $2.50 • 
                  <span className="text-[#00FFAE]"> Slippage:</span> 0.1% • 
                  <span className="text-white/50"> Time:</span> ~30 seconds
                </p>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
