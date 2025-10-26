import { motion } from "framer-motion";
import { Button } from "../components/ui/button";

export default function FaucetActions() {
  const tokens = [
    { name: "ETH", balance: "1.25", color: "#8B5CF6" },
    { name: "USDC", balance: "2500", color: "#10B981" },
    { name: "DAI", balance: "1800", color: "#F59E0B" },
    { name: "WBTC", balance: "0.05", color: "#F87171" },
  ];

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
        {tokens.map((token, index) => (
          <motion.div
            key={token.name}
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
                  background: `${token.color}20`,
                  color: token.color,
                }}
              >
                {token.name}
              </div>

              <div>
                <div className="font-medium">{token.name}</div>
                <div className="text-sm text-white/60">
                  Balance: {token.balance}
                </div>
              </div>
            </div>

            {/* Right: Faucet button */}
            <Button
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm"
              onClick={() => alert(`Requested ${token.name} from faucet`)}
            >
              Faucet
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
    
        </div>
        </div>
  );
}
