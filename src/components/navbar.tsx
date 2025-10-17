import { Shield, Bell, Settings, User } from "lucide-react";
import { Button } from "./ui/button";

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const navItems = [
    { id: "dashboard", label: "Portfolio" },
    { id: "rebalance", label: "Rebalance" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-white/10">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <button
            onClick={() => onNavigate("landing")}
            className="flex items-center gap-2 group"
          >
            <div className="relative">
              <Shield className="w-8 h-8 text-[#3B82F6] glow-blue-strong" />
              <div className="absolute inset-0 bg-[#3B82F6] opacity-20 blur-xl rounded-full" />
            </div>
            <span className="tracking-tight">
              LOGO
            </span>
          </button>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                  currentPage === item.id
                    ? "bg-[#3B82F6]/20 text-[#3B82F6] glow-blue"
                    : "text-white/70 hover:text-[#3B82F6] hover:bg-white/5"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              className="relative hover:bg-[#3B82F6]/10 hover:text-[#3B82F6]"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#8B5CF6] rounded-full animate-pulse" />
            </Button>
            <Button
              className="hover:bg-[#3B82F6]/10 hover:text-[#3B82F6]"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white hover:shadow-lg hover:shadow-[#3B82F6]/50 transition-all"
            >
              <User className="w-4 h-4 mr-2" />
              Connect Wallet
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
