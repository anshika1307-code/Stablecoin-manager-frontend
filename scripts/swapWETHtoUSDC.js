

import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();
// ---------- QUICK CONFIG ----------
const USDC_ADDRESS = process.env.USDC;
const WETH_ADDRESS = process.env.WETH;
const ROUTER_ADDRESS = process.env.MOCK_ROUTER;

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const privateKey = process.env.PRIVATE_KEY;
const signer = new ethers.Wallet(privateKey, provider);
// ---------- ABIs ----------
const ERC20_ABI = [
  "function faucet() external",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address, uint256) returns (bool)",
];
const mockTokenABI = [
  "function faucet() public",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

const ROUTER_ABI = [
  "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) payable returns (uint256)",
];

async function quickSwapTest() {
  console.log("\n Quick Swap Test: USDC → WETH\n");

  const address = await signer.getAddress();
  console.log("Wallet:", address);

  const usdc = new ethers.Contract(USDC_ADDRESS, mockTokenABI, signer);
  const weth = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, signer);
  const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, signer);

  console.log("\n1️⃣ Initial Balances:");
  let usdcBal = await usdc.balanceOf(address);
  let wethBal = await weth.balanceOf(address);
  console.log("   USDC:", ethers.formatUnits(usdcBal, 6));
  console.log("   WETH:", ethers.formatEther(wethBal));

  
  if (usdcBal < ethers.parseUnits("100", 6)) {
    console.log("\n2️⃣ Claiming USDC from faucet...");
    const tx = await usdc.faucet();
    await tx.wait();
    console.log("   ✅ Claimed!");
    usdcBal = await usdc.balanceOf(address);
  }


  const swapAmount = ethers.parseUnits("100", 6); // 100 USDC
  // console.log("\n3️⃣ Approving router...");
  // const approveTx = await usdc.approve(ROUTER_ADDRESS, swapAmount);
  // await approveTx.wait();
  // console.log("   ✅ Approved!");

  // 4. Swap
  console.log("\n Executing swap...");
  const params = {
    tokenIn: USDC_ADDRESS,
    tokenOut: WETH_ADDRESS,
    fee: 3000,
    recipient: address,
    amountIn: swapAmount,
    amountOutMinimum: 1, 
    sqrtPriceLimitX96: 0,
  };

  const swapTx = await router.exactInputSingle(params);
  console.log("   Tx:", swapTx.hash);
  await swapTx.wait();
  console.log("Swap complete!");

  // 5. Final balances
  console.log("\n Final Balances:");
  usdcBal = await usdc.balanceOf(address);
  wethBal = await weth.balanceOf(address);
  console.log("   USDC:", ethers.formatUnits(usdcBal, 6));
  console.log("   WETH:", ethers.formatEther(wethBal));

  console.log(` https://sepolia.etherscan.io/tx/${swapTx.hash}\n`);
}

quickSwapTest().catch(console.error);