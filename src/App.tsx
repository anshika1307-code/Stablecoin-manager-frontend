import { useState } from "react";
import { LandingPage } from "./pages/LandingPage.tsx";
import { Dashboard } from "./pages/Dashboard.tsx";
import { RebalancePage } from "./pages/Rebalance.tsx";
import { Navbar } from "./components/navbar.tsx";



export default function App() {
  const [currentPage, setCurrentPage] = useState("landing");
  // const [isConnected, setIsConnected] = useState(false);
  
   const renderPage = () => {
    switch (currentPage) {
      case "landing":
        return <LandingPage onNavigate={setCurrentPage} />;
      case "dashboard":
        return <Dashboard />;
      case "rebalance":
        return <RebalancePage />;
      default:
        return <LandingPage onNavigate={setCurrentPage} />;
    }
  };
  return (
    <div className="min-h-screen bg-[#0F172A] text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Main gradient orbs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] rounded-full blur-[150px] opacity-20 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-[#8B5CF6] to-[#6366F1] rounded-full blur-[140px] opacity-15 animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-[#3B82F6] rounded-full blur-[120px] opacity-10" />
        
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0F172A]/50 to-[#0F172A]" />
      </div>

      {/* Dot Grid Pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.15]"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(99, 102, 241, 0.4) 1px, transparent 1px)`,
          backgroundSize: "30px 30px",
        }}
      />

      {/* Content */}
       <div className="relative z-10">
        {currentPage !== "landing" && (
          <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />
        )}
        {renderPage()}
      </div>

  
    </div>
  );
}
