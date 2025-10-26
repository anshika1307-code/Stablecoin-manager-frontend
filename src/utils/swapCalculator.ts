import { TOKEN_CONFIG, type TokenSymbol, type ChainId } from './tokenBalanceUtils';

// Exchange rates matching your mock router configuration
// Rate calculation: (amountIn * rate) / 10000 = amountOut
const EXCHANGE_RATES: Record<string, number> = {
  // USDC pairs (6 decimals)
  'USDC-USDT': 9995,              // USDC → USDT (1:0.9995)
  'USDC-WETH': 4000000000000,     // USDC → WETH (0.0004 with decimals)
  'USDC-DAI': 10000000000000,     // USDC → DAI (1:1 with decimals)
  
  // USDT pairs (6 decimals)
  'USDT-USDC': 10005,             // USDT → USDC (1:1.0005)
  'USDT-WETH': 4000000000000,     // USDT → WETH (0.0004 with decimals)
  'USDT-DAI': 10000000000000,     // USDT → DAI (1:1 with decimals)
  
  // WETH pairs (18 decimals)
  'WETH-USDC': 25000,             // WETH → USDC (2500 with decimals)
  'WETH-USDT': 25000,             // WETH → USDT (2500 with decimals)
  'WETH-DAI': 25000000000000,     // WETH → DAI (2500:1 with decimals)
  
  // DAI pairs (18 decimals)
  'DAI-USDC': 10000,              // DAI → USDC (1:1 with decimals)
  'DAI-USDT': 10000,              // DAI → USDT (1:1 with decimals)
  'DAI-WETH': 4000000000000,      // DAI → WETH (0.0004 with decimals)
};

// Router fee and slippage (matching your mock router)
const ROUTER_FEE_BPS = 30;      // 0.3%
const SLIPPAGE_BPS = 50;        // 0.5%

/**
 * Calculate estimated output amount for a swap
 */
export function calculateSwapOutput(
  fromToken: TokenSymbol,
  toToken: TokenSymbol,
  amount: string,
  slippageTolerance: number = 0.5
): {
  estimatedOutput: string;
  minimumOutput: string;
  exchangeRate: string;
  priceImpact: number;
  fee: string;
} | null {
  try {
    // Get token configs
    const fromConfig = TOKEN_CONFIG[fromToken];
    const toConfig = TOKEN_CONFIG[toToken];

    if (!fromConfig || !toConfig) {
      console.error('Invalid token pair');
      return null;
    }

    // Get exchange rate
    const rateKey = `${fromToken}-${toToken}`;
    const rate = EXCHANGE_RATES[rateKey];

    if (!rate) {
      console.error(`No exchange rate found for ${fromToken} → ${toToken}`);
      return null;
    }

    // Convert input amount to BigInt (smallest unit)
    const amountInFloat = parseFloat(amount);
    if (isNaN(amountInFloat) || amountInFloat <= 0) {
      return null;
    }

    const amountInBigInt = BigInt(Math.floor(amountInFloat * 10 ** fromConfig.decimals));

    // Calculate base output: (amountIn * rate) / 10000
    const baseOutput = (amountInBigInt * BigInt(rate)) / BigInt(10000);

    // Calculate fee: (baseOutput * routerFeeBps) / 10000
    const feeAmount = (baseOutput * BigInt(ROUTER_FEE_BPS)) / BigInt(10000);

    // Calculate slippage: (baseOutput * slippageBps) / 10000
    const slippageAmount = (baseOutput * BigInt(SLIPPAGE_BPS)) / BigInt(10000);

    // Final output after fees and slippage
    const finalOutput = baseOutput - feeAmount - slippageAmount;

    // Calculate minimum output based on user's slippage tolerance
    const userSlippageBps = Math.floor(slippageTolerance * 100);
    const minOutput = (finalOutput * BigInt(10000 - userSlippageBps)) / BigInt(10000);

    // Format outputs
    const estimatedOutput = formatTokenAmount(finalOutput.toString(), toConfig.decimals);
    const minimumOutput = formatTokenAmount(minOutput.toString(), toConfig.decimals);
    const feeFormatted = formatTokenAmount(feeAmount.toString(), toConfig.decimals);

    // Calculate exchange rate (1 fromToken = X toToken)
    const exchangeRate = (parseFloat(estimatedOutput) / amountInFloat).toFixed(6);

    // Calculate price impact (simplified)
    const priceImpact = ((parseFloat(feeFormatted) + parseFloat(formatTokenAmount(slippageAmount.toString(), toConfig.decimals))) / amountInFloat) * 100;

    return {
      estimatedOutput,
      minimumOutput,
      exchangeRate,
      priceImpact,
      fee: feeFormatted,
    };
  } catch (error) {
    console.error('Error calculating swap output:', error);
    return null;
  }
}

/**
 * Format token amount from smallest unit to human readable
 */
function formatTokenAmount(amount: string, decimals: number): string {
  const num = BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const integerPart = num / divisor;
  const fractionalPart = num % divisor;
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const result = `${integerPart}.${fractionalStr}`;
  
  return parseFloat(result).toFixed(decimals);
}

/**
 * Get human-readable exchange rate
 */
export function getExchangeRate(
  fromToken: TokenSymbol,
  toToken: TokenSymbol
): string {
  const result = calculateSwapOutput(fromToken, toToken, '1', 0);
  if (!result) return 'N/A';
  
  return `1 ${fromToken} = ${parseFloat(result.estimatedOutput).toFixed(6)} ${toToken}`;
}

/**
 * Check if swap pair is available
 */
export function isSwapPairAvailable(
  fromToken: TokenSymbol,
  toToken: TokenSymbol
): boolean {
  const rateKey = `${fromToken}-${toToken}`;
  return EXCHANGE_RATES[rateKey] !== undefined;
}

/**
 * Get all available swap pairs for a token
 */
export function getAvailableSwapPairs(token: TokenSymbol): TokenSymbol[] {
  const availablePairs: TokenSymbol[] = [];
  
  (Object.keys(TOKEN_CONFIG) as TokenSymbol[]).forEach((targetToken) => {
    if (targetToken !== token && isSwapPairAvailable(token, targetToken)) {
      availablePairs.push(targetToken);
    }
  });
  
  return availablePairs;
}

/**
 * Calculate USD value (assuming stablecoins = $1, ETH price dynamic)
 */
export function calculateUSDValue(
  token: TokenSymbol,
  amount: string
): number {
  const amountNum = parseFloat(amount);
  
  if (token === 'USDC' || token === 'USDT' || token === 'DAI') {
    return amountNum; // 1:1 for stablecoins
  }
  
  if (token === 'WETH') {
    // Calculate ETH price based on WETH → USDC rate
    const result = calculateSwapOutput('WETH', 'USDC', '1', 0);
    if (!result) return 0;
    
    const ethPrice = parseFloat(result.estimatedOutput);
    return amountNum * ethPrice;
  }
  
  return 0;
}

/**
 * Estimate gas cost in USD
 */
export function estimateGasCost(
  fromChain: ChainId,
  toChain: ChainId,
  isCrossChain: boolean
): string {
  // Simplified gas estimation
  if (isCrossChain) {
    // Bridge + Swap costs more
    return fromChain === 11155111 ? '$15.00' : '$2.00';
  }
  
  // Direct swap
  return fromChain === 11155111 ? '$12.50' : '$0.50';
}

/**
 * Calculate swap summary
 */
export function calculateSwapSummary(
  fromToken: TokenSymbol,
  toToken: TokenSymbol,
  amount: string,
  fromChain: ChainId,
  toChain: ChainId,
  slippageTolerance: number = 0.5
) {
  const swapCalc = calculateSwapOutput(fromToken, toToken, amount, slippageTolerance);
  
  if (!swapCalc) {
    return null;
  }

  const isCrossChain = fromChain !== toChain;
  const gasCost = estimateGasCost(fromChain, toChain, isCrossChain);
  
  const inputValueUSD = calculateUSDValue(fromToken, amount);
  const outputValueUSD = calculateUSDValue(toToken, swapCalc.estimatedOutput);
  
  return {
    ...swapCalc,
    inputAmount: amount,
    inputToken: fromToken,
    outputToken: toToken,
    inputValueUSD,
    outputValueUSD,
    gasCost,
    isCrossChain,
    route: isCrossChain ? 'Bridge + Swap' : 'Direct Swap',
  };
}