import { ethers } from "ethers";

// ---------- QUICK CONFIG ----------
// Sepolia addresses
const USDC_ADDRESS = "0x72E4AF81B73E7fc29156f6FfA8E8413E4385b2D8";
const WETH_ADDRESS = "0x3981A8CdB4d2C532FF4eB76a4A0d51CAd74b3b5a";
const ROUTER_ADDRESS = "0x60aE531D9448445fC6d9Da4f4B0e87940711126d";

const provider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/2e5821904bff4cf0a42413b10a7c1257");
const privateKey = "";
const signer = new ethers.Wallet(privateKey, provider);

// ---------- ABIs ----------
const ERC20_ABI = [
  "function faucet() external",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address, uint256) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

const ROUTER_ABI = [
  "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) payable returns (uint256)",
  "function getAmountOut(address tokenIn, address tokenOut, uint256 amountIn) view returns (uint256)",
];

// ---------- MAIN ----------
async function quickSwapTest() {
  console.log("\n Swap Test: USDC → WETH\n");

  const address = await signer.getAddress();
  console.log("Wallet:", address);

  // Connect to contracts
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
  const weth = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, signer);
  const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, signer);

  // 1. Check balances
  console.log("\n Initial Balances:");
  let usdcBal = await usdc.balanceOf(address);
  let wethBal = await weth.balanceOf(address);
  console.log("   USDC:", ethers.formatUnits(usdcBal, 6));
  console.log("   WETH:", ethers.formatEther(wethBal));

  // Check router balances
  console.log("\n Router Balances:");
  const routerUSDC = await usdc.balanceOf(ROUTER_ADDRESS);
  const routerWETH = await weth.balanceOf(ROUTER_ADDRESS);
  console.log("   USDC:", ethers.formatUnits(routerUSDC, 6));
  console.log("   WETH:", ethers.formatEther(routerWETH));

  // 2. Claim USDC if needed
  if (usdcBal < ethers.parseUnits("100", 6)) {
    console.log("\n Claiming USDC from faucet...");
    try {
      const tx = await usdc.faucet();
      await tx.wait();
      console.log("Claimed!");
      usdcBal = await usdc.balanceOf(address);
    } catch (error) {
      console.log("Faucet cooldown or already claimed");
    }
  }

  // 3. Check and set approval
  const swapAmount = ethers.parseUnits("100", 6); // 100 USDC
  
  console.log("\n Checking approval...");
  const currentAllowance = await usdc.allowance(address, ROUTER_ADDRESS);
  console.log("   Current allowance:", ethers.formatUnits(currentAllowance, 6));

  if (currentAllowance < swapAmount) {
    console.log("   Approving router to spend USDC...");
    const approveTx = await usdc.approve(ROUTER_ADDRESS, ethers.MaxUint256); // Approve max for future swaps
    await approveTx.wait();
    console.log("Approved!");
  } else {
    console.log("Already approved");
  }

  // 4. Estimate output
  console.log("\n Estimating swap output...");
  try {
    const estimatedOut = await router.getAmountOut(USDC_ADDRESS, WETH_ADDRESS, swapAmount);
    console.log("   Expected WETH:", ethers.formatEther(estimatedOut));
  } catch (error) {
    console.log(" Could not estimate (might still work)");
  }

  // 5. Execute swap
  console.log("\n Executing swap...");
  const params = {
    tokenIn: USDC_ADDRESS,
    tokenOut: WETH_ADDRESS,
    fee: 3000,
    recipient: address,
    amountIn: swapAmount,
    amountOutMinimum: 1, // Accept any amount (for testing)
    sqrtPriceLimitX96: 0,
  };

  try {
    const swapTx = await router.exactInputSingle(params);
    console.log("   Tx:", swapTx.hash);
    console.log("   Waiting for confirmation...");
    const receipt = await swapTx.wait();
    console.log(" Swap complete! Block:", receipt.blockNumber);
  } catch (error) {
    console.error("\n Swap failed:", error.message);
    
    // Detailed debugging
    if (error.message.includes("SafeERC20")) {
      console.log("\n Debug Info:");
      console.log("   Router has WETH:", ethers.formatEther(routerWETH));
      console.log("   Your USDC balance:", ethers.formatUnits(usdcBal, 6));
      console.log("   Swap amount:", ethers.formatUnits(swapAmount, 6));
      
      // Check if router has enough WETH
      const estimatedOut = await router.getAmountOut(USDC_ADDRESS, WETH_ADDRESS, swapAmount);
      console.log("   Needs WETH:", ethers.formatEther(estimatedOut));
      
      if (routerWETH < estimatedOut) {
        console.log("\n Router doesn't have enough WETH!");
        console.log(" Run: node scripts/refund-router.js");
      }
    }
    
    throw error;
  }

  // 6. Final balances
  console.log("\n Final Balances:");
  usdcBal = await usdc.balanceOf(address);
  wethBal = await weth.balanceOf(address);
  console.log("   USDC:", ethers.formatUnits(usdcBal, 6));
  console.log("   WETH:", ethers.formatEther(wethBal));

  console.log("\n Test completed!");
}

quickSwapTest().catch((error) => {
  console.error("\n Error:", error.message);
  process.exit(1);
});