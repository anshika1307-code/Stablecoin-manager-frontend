import { motion } from "motion/react";
import { Shield } from "lucide-react";

export function CoinOrbit() {
  const coins = [
    { name: "USDT", symbol: "$", color: "#26A17B", delay: 0, radius: 85, duration: 12, size: 40 },
    { name: "USDC", symbol: "$", color: "#2775CA", delay: 0.5, radius: 115, duration: 16, size: 36 },
    { name: "DAI", symbol: "◈", color: "#F5AC37", delay: 1, radius: 145, duration: 20, size: 38 },
  ];

  // Orbit rings for each coin
  const orbitRings = [85, 115, 145];

  return (
    <div className="relative w-96 h-96 mx-auto">
      {/* Orbit Rings */}
      {orbitRings.map((radius, _index) => (
        <div
          key={`ring-${radius}`}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#3B82F6]/10"
          style={{
            width: `${radius * 2}px`,
            height: `${radius * 2}px`,
          }}
        />
      ))}

      {/* Center Shield */}
      <motion.div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-[#3B82F6] to-[#6366F1] p-0.5 shadow-lg glow-blue-strong">
            <div className="w-full h-full rounded-2xl bg-[#1E293B] flex items-center justify-center">
              <Shield className="w-10 h-10 text-[#3B82F6]" strokeWidth={2} />
            </div>
          </div>
          <div className="absolute inset-0 bg-[#3B82F6] opacity-20 blur-2xl rounded-full" />
        </div>
      </motion.div>

      {/* Orbiting Coins */}
      {coins.map((coin, _index) => (
        <motion.div
          key={coin.name}
          className="absolute top-1/2 left-1/2 z-10"
          style={{
            width: 0,
            height: 0,
          }}
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: coin.duration,
            repeat: Infinity,
            ease: "linear",
            delay: coin.delay,
          }}
        >
          <motion.div
            className="absolute"
            style={{
              left: `${coin.radius}px`,
              top: '0px',
              transform: 'translate(-50%, -50%)',
            }}
            animate={{
              rotate: -360,
            }}
            transition={{
              duration: coin.duration,
              repeat: Infinity,
              ease: "linear",
              delay: coin.delay,
            }}
          >
            <motion.div
              className="relative"
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: coin.delay,
              }}
            >
              {/* Coin glow */}
              <div
                className="absolute inset-0 rounded-full blur-xl opacity-50"
                style={{
                  background: coin.color,
                  width: `${coin.size}px`,
                  height: `${coin.size}px`,
                  transform: 'translate(-50%, -50%)',
                  left: '50%',
                  top: '50%',
                }}
              />
              
              {/* Coin */}
              <div
                className="relative rounded-full flex items-center justify-center"
                style={{
                  width: `${coin.size}px`,
                  height: `${coin.size}px`,
                  background: `linear-gradient(135deg, ${coin.color}30, ${coin.color}10)`,
                  border: `2px solid ${coin.color}`,
                  boxShadow: `0 0 15px ${coin.color}60, inset 0 0 10px ${coin.color}20`,
                }}
              >
                <span
                  className="text-sm"
                  style={{ color: coin.color }}
                >
                  {coin.symbol}
                </span>
              </div>

              {/* Coin label */}
              <div
                className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs whitespace-nowrap"
                style={{ color: coin.color }}
              >
                {coin.name}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      ))}

      {/* Outer glow ring */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 border border-[#3B82F6]/5 rounded-full" />
    </div>
  );
}
