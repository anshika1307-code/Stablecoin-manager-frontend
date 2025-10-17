import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, ArrowUpRight, RefreshCw } from "lucide-react";
// import { AsaAgent } from "../components/AsaAgent";
// import { StabilityGauge } from "../components/StabilityGauge";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { Button } from "../components/ui/button";

export function Dashboard() {
  const portfolioData = [
    { name: "USDT", value: 45, color: "#26A17B" },
    { name: "USDC", value: 35, color: "#2775CA" },
    { name: "DAI", value: 15, color: "#F5AC37" },
    { name: "FDUSD", value: 5, color: "#8B5CF6" },
  ];

  const transactions = [
    { id: 1, type: "Rebalance", from: "USDT", to: "USDC", amount: "500", time: "2 hours ago", status: "success" },
    { id: 2, type: "Yield Claim", from: "Aave", to: "Wallet", amount: "12.45", time: "5 hours ago", status: "success" },
    { id: 3, type: "Auto-Swap", from: "DAI", to: "USDC", amount: "250", time: "1 day ago", status: "success" },
    { id: 4, type: "Deposit", from: "Wallet", to: "Curve", amount: "1000", time: "2 days ago", status: "success" },
  ];

  const performanceData = [
    { time: "Mon", value: 98500 },
    { time: "Tue", value: 99200 },
    { time: "Wed", value: 98800 },
    { time: "Thu", value: 99600 },
    { time: "Fri", value: 100200 },
    { time: "Sat", value: 99800 },
    { time: "Sun", value: 100450 },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl mb-2">Portfolio Overview</h1>
            <p className="text-white/60">Monitor and manage your stablecoin portfolio</p>
          </div>
          <Button className="bg-[#3B82F6] text-white hover:bg-[#3B82F6]/80 glow-blue">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Portfolio Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 glass rounded-2xl p-6 border-glow"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm text-white/60 mb-1">Total Balance</h2>
                <div className="text-4xl text-[#3B82F6] text-glow-blue">
                  $100,450.00
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp className="w-4 h-4 text-[#8B5CF6]" />
                  <span className="text-sm text-[#8B5CF6]">+2.3% ($2,250)</span>
                  <span className="text-xs text-white/40">This month</span>
                </div>
              </div>
              {/* <StabilityGauge score={94} size={140} /> */}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Donut Chart */}
              <div>
                <h3 className="text-sm text-white/60 mb-4">Asset Distribution</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={portfolioData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {portfolioData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {portfolioData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-white/70">{item.name}</span>
                      <span className="text-sm text-white/50">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Chart */}
              <div>
                <h3 className="text-sm text-white/60 mb-4">7-Day Performance</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={performanceData}>
                    <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" style={{ fontSize: 12 }} />
                    <YAxis hide domain={['dataMin - 500', 'dataMax + 500']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(30, 41, 59, 0.9)",
                        border: "1px solid rgba(99, 102, 241, 0.3)",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="glass rounded-2xl p-6 border-glow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/60">Total Yield Earned</span>
                <ArrowUpRight className="w-4 h-4 text-[#8B5CF6]" />
              </div>
              <div className="text-2xl text-[#8B5CF6]">$2,345.67</div>
              <div className="text-xs text-white/40 mt-1">+5.2% APY average</div>
            </div>

            <div className="glass rounded-2xl p-6 border-glow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/60">Active Positions</span>
              </div>
              <div className="text-2xl">7</div>
              <div className="text-xs text-white/40 mt-1">Across 4 protocols</div>
            </div>

            <div className="glass rounded-2xl p-6 border-glow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/60">Risk Level</span>
              </div>
              <div className="text-2xl text-[#8B5CF6]">Low</div>
              <div className="text-xs text-white/40 mt-1">Auto-balanced daily</div>
            </div>
          </motion.div>
        </div>

        {/* ASA Agent Panel */}
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <AsaAgent
            message="USDT showing 0.7% depeg risk based on recent market volatility. I suggest shifting 10% to USDC to maintain stability. This will optimize your risk-adjusted returns. Proceed with rebalance?"
            onApprove={() => console.log("Approved")}
            onIgnore={() => console.log("Ignored")}
          />
        </motion.div> */}

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-6 border-glow"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl">Recent Transactions</h2>
            <Button className="text-[#3B82F6] hover:bg-[#3B82F6]/10">
              View All
            </Button>
          </div>

          <div className="space-y-3">
            {transactions.map((tx, index) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#3B82F6]/20 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-[#3B82F6]" />
                  </div>
                  <div>
                    <div>{tx.type}</div>
                    <div className="text-sm text-white/60">
                      {tx.from} → {tx.to}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div>${tx.amount}</div>
                  <div className="text-sm text-white/40">{tx.time}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
