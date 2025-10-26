import { TOKEN_CONFIG, type TokenSymbol, type ChainId } from './tokenBalanceUtils';

// Exchange rates matching your mock router configuration
// Rate calculation: (amountIn * rate) / 10000 = amountOut
const EXCHANGE_RATES: Record<string, number> = {
  // ===== Existing =====
  'USDC-USDT': 9995,
  'USDC-WETH': 4000000000000,
  'USDC-DAI': 10000000000000,

  'USDT-USDC': 10005,
  'USDT-WETH': 4000000000000,
  'USDT-DAI': 10000000000000,

  'WETH-USDC': 25000,
  'WETH-USDT': 25000,
  'WETH-DAI': 25000000000000,

  'DAI-USDC': 10000,
  'DAI-USDT': 10000,
  'DAI-WETH': 4000000000000,

  // ===== New Stables =====
  // Stable ↔ Stable (1:1)
  'FDUSD-USDC': 10000, 'FDUSD-USDT': 10000, 'FDUSD-DAI': 10000, 'FDUSD-BUSD': 10000, 'FDUSD-TUSD': 10000, 'FDUSD-USDP': 10000, 'FDUSD-PYUSD': 10000, 'FDUSD-USDD': 10000, 'FDUSD-GUSD': 10000,

  'BUSD-USDC': 10000, 'BUSD-USDT': 10000, 'BUSD-DAI': 10000, 'BUSD-FDUSD': 10000, 'BUSD-TUSD': 10000, 'BUSD-USDP': 10000, 'BUSD-PYUSD': 10000, 'BUSD-USDD': 10000, 'BUSD-GUSD': 10000,

  'TUSD-USDC': 10000, 'TUSD-USDT': 10000, 'TUSD-DAI': 10000, 'TUSD-FDUSD': 10000, 'TUSD-BUSD': 10000, 'TUSD-USDP': 10000, 'TUSD-PYUSD': 10000, 'TUSD-USDD': 10000, 'TUSD-GUSD': 10000,

  'USDP-USDC': 10000, 'USDP-USDT': 10000, 'USDP-DAI': 10000, 'USDP-FDUSD': 10000, 'USDP-BUSD': 10000, 'USDP-TUSD': 10000, 'USDP-PYUSD': 10000, 'USDP-USDD': 10000, 'USDP-GUSD': 10000,

  'PYUSD-USDC': 10000, 'PYUSD-USDT': 10000, 'PYUSD-DAI': 10000, 'PYUSD-FDUSD': 10000, 'PYUSD-BUSD': 10000, 'PYUSD-TUSD': 10000, 'PYUSD-USDP': 10000, 'PYUSD-USDD': 10000, 'PYUSD-GUSD': 10000,

  'USDD-USDC': 10000, 'USDD-USDT': 10000, 'USDD-DAI': 10000, 'USDD-FDUSD': 10000, 'USDD-BUSD': 10000, 'USDD-TUSD': 10000, 'USDD-USDP': 10000, 'USDD-PYUSD': 10000, 'USDD-GUSD': 10000,

  'GUSD-USDC': 10000, 'GUSD-USDT': 10000, 'GUSD-DAI': 10000, 'GUSD-FDUSD': 10000, 'GUSD-BUSD': 10000, 'GUSD-TUSD': 10000, 'GUSD-USDP': 10000, 'GUSD-PYUSD': 10000, 'GUSD-USDD': 10000,

  // ===== Stable ↔ WETH =====
  'FDUSD-WETH': 4000000000000,
  'BUSD-WETH': 4000000000000,
  'TUSD-WETH': 4000000000000,
  'USDP-WETH': 4000000000000,
  'PYUSD-WETH': 4000000000000,
  'USDD-WETH': 4000000000000,
  'GUSD-WETH': 4000000000000,

  'WETH-FDUSD': 25000,
  'WETH-BUSD': 25000,
  'WETH-TUSD': 25000,
  'WETH-USDP': 25000,
  'WETH-PYUSD': 25000,
  'WETH-USDD': 25000,
  'WETH-GUSD': 25000,
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
  _toChain: ChainId,
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