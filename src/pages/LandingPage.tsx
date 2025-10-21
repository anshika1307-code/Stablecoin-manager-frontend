import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { WalletButton } from "../components/WalletButton";

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-tr from-[#8B5CF6] to-[#6366F1] rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-block mb-4 px-4 py-2 glass rounded-full border-glow"
              >
                <span className="text-sm text-[#8B5CF6]">🚀 Powered by AI</span>
              </motion.div>

              <h1 className="text-5xl lg:text-6xl mb-6 leading-tight">
                <span className="text-glow-blue text-[#3B82F6]">Protect</span> Your Stablecoins.{" "}
                <span className="text-glow-purple text-[#8B5CF6]">Optimize</span> Your Yield.{" "}
                <span className="text-white">Stay Pegged.</span>
              </h1>

              <p className="text-xl text-white/70 mb-8 leading-relaxed">
                AI-powered stablecoin manager that monitors depegs, optimizes yield,
                and auto-rebalances portfolios across chains using smart swaps.
              </p>

              <div className="flex flex-wrap gap-4">

                {/* <Button
                    onClick={() => onNavigate("dashboard")}
                  className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white hover:shadow-2xl hover:shadow-[#3B82F6]/50 transition-all text-lg px-8"
                >
                  Connect Wallet
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button> */}
                <WalletButton
                  showArrow
                  onConnectedNavigate={() => onNavigate("dashboard")}
                />
              </div>

            </motion.div>
          </div>
        </div>
      </section>


    </div>
  );
}
