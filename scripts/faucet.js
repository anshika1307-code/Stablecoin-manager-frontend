
// // // faucetUSDC.js
import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();
// // // // ---------- CONFIG ----------
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const privateKey = process.env.PRIVATE_KEY;
const signer = new ethers.Wallet(privateKey, provider);

const USDC_ADDRESS = process.env.USDC;
const WETH_ADDRESS = process.env.WETH;
// // // // ---------- ABIs ----------
const mockTokenABI = [
  "function faucet() public",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

// // // // ---------- MAIN ----------
async function runFaucet() {
// // //   console.log("\n🚀 Running USDC Faucet Script on Sepolia...\n");

  const address = await signer.getAddress();
  console.log("🔑 Signer:", address);
  
  const ethBalance = await provider.getBalance(address);
  console.log("💰 ETH Balance:", ethers.formatEther(ethBalance), "ETH");

  const network = await provider.getNetwork();
  console.log("🌐 Network:", network.name, `(${network.chainId})`);


  const usdc = new ethers.Contract(USDC_ADDRESS, mockTokenABI, signer);
  const weth = new ethers.Contract(WETH_ADDRESS, mockTokenABI, signer);
  const decimals = await usdc.decimals().catch(() => 6); // fallback to 6 decimals
  const wethDecimals = await weth.decimals().catch(() => 18); // fallback to 18 decimals

  const balanceBefore = await usdc.balanceOf(address);
  console.log(" USDC Balance Before:", ethers.formatUnits(balanceBefore, decimals));
  const wethBalanceBefore = await weth.balanceOf(address);
  console.log(" WETH Balance Before:", ethers.formatUnits(wethBalanceBefore, wethDecimals));
// //   // Faucet call
  console.log("\n💧 Requesting tokens from faucet...");
  const tx = await usdc.faucet();
  await tx.wait();
  console.log(" Faucet transaction completed!");
  console.log(" Tx Hash:", tx.hash);


  const balanceAfter = await usdc.balanceOf(address);
  console.log(" USDC Balance After:", ethers.formatUnits(balanceAfter, decimals));

  console.log("\n Done!");
}

runFaucet().catch((err) => {
  console.error("❌ Error:", err);
});

