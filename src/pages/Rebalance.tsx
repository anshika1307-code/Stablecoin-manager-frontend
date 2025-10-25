import { motion } from "framer-motion";
import { ArrowRight, ArrowUpDown, CheckCircle, Info, RefreshCw } from "lucide-react";
import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useNexusBridge } from "../hooks/useNexusBridge";
import { useNexusExecute } from "../hooks/useNexusExecute";
import { ethers } from "ethers";
import { Button } from "../components/ui/button";
import { TabsContent, TabsList, TabsTrigger, Tabs } from "../components/ui/tabs";

// Token addresses per chain
const TOKEN_ADDRESSES: Record<number, Record<string, string>> = {
  11155111: { // Sepolia
    USDC: '0x72E4AF81B73E7fc29156f6FfA8E8413E4385b2D8',
    USDT: '0x3d90917bBB02bb156B2eD7BEDb20d84d7E49b135',
    WETH: '0x3981A8CdB4d2C532FF4eB76a4A0d51CAd74b3b5a',
  },
  84532: { // Base Sepolia
    USDC: '0xF79dd583eDb09c80a0b2FF0cd1B274F1Ec361cA4',
    USDT: '0x55e877aEF97A918D3c7f729a691F7DC9831A5695',
  },
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
const ERC20_ABI = [
  "function faucet() external",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address, uint256) returns (bool)",
];
export function RebalancePage() {
  const { bridge, bridging } = useNexusBridge();
  const { execute, executing } = useNexusExecute();

  const [isRebalancing, setIsRebalancing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const [fromToken, setFromToken] = useState("USDT");
  const [toToken, setToToken] = useState("USDC");
  const [fromChain, setFromChain] = useState("Ethereum");
  const [toChain, setToChain] = useState("Ethereum");
  const [swapAmount, setSwapAmount] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [swapError, setSwapError] = useState("");

  const gasEstimateUSD = 1.25;
  const tokenPriceUSD = 1.00;

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

  const chains = [
    { name: "Ethereum", id: 11155111 },
    { name: "Polygon", id: 80002 },
    { name: "Arbitrum", id: 421614 },
    { name: "Optimism", id: 11155420 },
    { name: "Base", id: 84532 },
  ];

  const [activeTab, setActiveTab] = useState("ai-suggested");

  const handleRebalance = () => {
    setIsRebalancing(true);
    setTimeout(() => {
      setIsRebalancing(false);
      setIsComplete(true);
    }, 3000);
  };

  const getChainId = (chainName: string): number => {
    return chains.find(c => c.name === chainName)?.id || 11155111;
  };

  const handleManualSwap = async () => {
    if (!swapAmount || parseFloat(swapAmount) <= 0) {
      setSwapError('Please enter a valid amount');
      return;
    }

    setIsSwapping(true);
    setSwapError('');
    setTxHash('');

    try {
      const fromChainId = getChainId(fromChain);
      const toChainId = getChainId(toChain);
      const isCrossChain = fromChain !== toChain;

      // Convert amount to BigInt
      const decimals = fromToken === 'USDC' || fromToken === 'USDT' ? 6 : 18;
      const amountInBigInt = BigInt(Math.floor(parseFloat(swapAmount) * 10 ** decimals));

      if (isCrossChain) {
        // Step 1: Bridge tokens to destination chain
        console.log('Cross-chain swap detected. Bridging first...');

        const bridgeParams = {
          token: fromToken as any,
          amount: parseFloat(swapAmount),
          chainId: toChainId as any,
        };

        const bridgeResult = await bridge(bridgeParams);

        if (!bridgeResult?.success) {
          throw new Error('Bridge failed');
        }

        console.log('Bridge successful, now executing swap on destination chain...');
      }

      // Step 2: Execute swap (either on same chain or after bridge)
      const targetChainId = isCrossChain ? toChainId : fromChainId;
      const tokenInAddress = TOKEN_ADDRESSES[targetChainId]?.[fromToken];
      const tokenOutAddress = TOKEN_ADDRESSES[targetChainId]?.[toToken];
      const routerAddress = ROUTER_ADDRESSES[targetChainId];

      if (!tokenInAddress || !tokenOutAddress || !routerAddress) {
        throw new Error('Token or router not configured for selected chain');
      }

      const executeParams = {
        toChainId: targetChainId as any,
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
      }
    } catch (error: any) {
      console.error('Swap error:', error);
      setSwapError(error.message || 'Swap failed');
    } finally {
      setIsSwapping(false);
    }
  };

  const estimatedReceive = swapAmount ? (parseFloat(swapAmount) * 0.999).toFixed(2) : "0.00";
  const gasEstimate = fromChain === "Ethereum" ? "$12.50" : "$0.50";

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Portfolio Rebalance</h1>
          <p className="text-white/60">Optimize your stablecoin allocation for maximum stability</p>
        </div>

        {isComplete ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-12 border-glow  text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="inline-block p-6 rounded-full bg-[#00FFAE]/20 mb-6 glow-green"
            >
              <CheckCircle className="w-16 h-16 text-[#00FFAE]" />
            </motion.div>
            <h2 className="text-3xl font-bold mb-4">Swap Complete!</h2>
            <p className="text-white/70 mb-8 max-w-md mx-auto">
              Successfully swapped {swapAmount} {fromToken} → {toToken}
              {fromChain !== toChain && ` (bridged from ${fromChain} to ${toChain})`}
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
                }}
                className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white"
              >
                Make Another Swap
              </Button>
            </div>
          </motion.div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8 bg-white/5 border border-white/10">
              <TabsTrigger value="ai-suggested" className="data-[state=active]:bg-[#3B82F6]">
                AI Suggested
              </TabsTrigger>
              <TabsTrigger value="manual-swap" className="data-[state=active]:bg-[#8B5CF6]">
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
            <TabsContent value="manual-swap" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 rounded-2xl p-6 border border-white/10 max-w-2xl mx-auto"
              >
                <h2 className="text-xl mb-6">Manual Token Swap</h2>

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
                        {chains.map((chain) => (
                          <option key={chain.name} value={chain.name}>
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
                        {chains.map((chain) => (
                          <option key={chain.name} value={chain.name}>
                            {chain.name}
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
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Route</span>
                    <span className="text-xs">
                      {fromChain === toChain ? "Direct Swap" : "Bridge + Swap"}
                    </span>
                  </div>
                </div>

                {fromChain !== toChain && (
                  <div className="bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-lg p-4 mb-6 flex gap-3">
                    <Info className="w-5 h-5 text-[#3B82F6] shrink-0 mt-0.5" />
                    <p className="text-sm text-white/70">
                      Cross-chain swap detected. Your tokens will be bridged from {fromChain} to {toChain} and swapped in one transaction.
                    </p>
                  </div>
                )}

                {swapError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                    <p className="text-sm text-red-400">{swapError}</p>
                  </div>
                )}

                <button
                  onClick={handleManualSwap}
                  disabled={isSwapping || bridging || !swapAmount || parseFloat(swapAmount) <= 0}
                  className="w-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white py-3 rounded-lg font-medium hover:shadow-2xl hover:shadow-[#8B5CF6]/50 transition-all disabled:opacity-50"
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