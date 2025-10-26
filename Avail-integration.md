# Stablecoin Manager - Avail Nexus Integration

A decentralized stablecoin management platform leveraging **Avail Nexus** for seamless cross-chain liquidity and operations.

## Project Goal

Manage stablecoins across multiple blockchains without bridging complexity and with help of AI and be secure of depeg of stablecoin, enabling users to:
- Transfer assets cross-chain instantly
- Rebalance portfolios across networks
- Access multichain liquidity from a single interface

## Avail Nexus Integration

**What is Avail Nexus?** A permissionless cross-chain layer enabling connectivity between different blockchains with ZK-proof verification, eliminating traditional bridges.

**Why We Use It:** Provides seamless multichain access to 10+ blockchains (Ethereum, Arbitrum, Base, Polygon, Optimism, etc.) without network switching or bridging delays.

---

## Key Files & Their Purpose

### **Core Integration Files**

#### `src/lib/nexus.ts`
```typescript
// Purpose: Nexus SDK initialization and configuration
// Functions: Setup Nexus client, configure supported chains
// Why: Central configuration for all cross-chain operations
```

#### `src/contexts/NexusContext.tsx`
```typescript
// Purpose: React context for Nexus state management
// Functions: Provides Nexus client instance across the app
// Why: Makes Nexus accessible to all components without prop drilling
```

---

### **Custom Hooks (Core Functionality)**

#### `src/hooks/useNexusBridge.tsx`
```typescript
// Purpose: Cross-chain bridging logic
// Functions: Bridge tokens between supported chains
// Why: Enables seamless asset transfers without leaving the app
```

#### `src/hooks/useNexusBridgeExecute.tsx`
```typescript
// Purpose: Execute bridge transactions
// Functions: Submit and track cross-chain transfers
// Why: Handles transaction execution with proper error handling
```

#### `src/hooks/useNexusBalance.tsx`
```typescript
// Purpose: Fetch balances across chains
// Functions: Query token balances on all connected chains
// Why: Display unified portfolio view
```

#### `src/hooks/useNexusTransfer.tsx`
```typescript
// Purpose: Intra-chain transfers using Nexus
// Functions: Transfer tokens within same chain
// Why: Unified transfer interface
```

#### `src/hooks/useNexusExecute.tsx`
```typescript
// Purpose: Generic transaction execution
// Functions: Execute any Nexus-compatible transaction
// Why: Flexible transaction handling
```

#### `src/hooks/useTokenFaucet.tsx`
```typescript
// Purpose: Request test tokens
// Functions: Interact with faucet for testing
// Why: Development and testing support
```

---

### **UI Components**

#### `src/components/Bridge.tsx`
```typescript
// Purpose: Bridge interface component
// Uses: useNexusBridge, useNexusBridgeExecute
// Why: User-facing bridge functionality
```

#### `src/components/NexusInit.tsx`
```typescript
// Purpose: Initialize Nexus on app load
// Uses: NexusContext
// Why: Ensures Nexus is ready before user interactions
```

#### `src/pages/Dashboard.tsx`
```typescript
// Purpose: Main portfolio dashboard
// Uses: useNexusBalance
// Why: Display cross-chain balances
```

#### `src/pages/Rebalance.tsx`
```typescript
// Purpose: Portfolio rebalancing interface
// Uses: useNexusBridge, useNexusBalance
// Why: Optimize asset distribution across chains
```

---

### **Utilities**

#### `src/utils/swapCalculator.ts`
```typescript
// Purpose: Calculate optimal swap routes
// Why: Support DEX integrations for rebalancing
```

#### `src/utils/tokenBalanceUtils.ts`
```typescript
// Purpose: Balance formatting and calculations
// Why: Consistent balance display across chains
```

---

### **Scripts**

#### `scripts/faucet.js`
```javascript
// Purpose: Backend faucet interaction
// Why: Automate test token distribution
```

#### `scripts/swapWETHtoUSDC.js`
```javascript
// Purpose: Token swap automation
// Why: Testing swap functionality
```

---

## How It Works

```
1. Initialization → NexusInit sets up Nexus SDK on app start
2. User Action → User initiates cross-chain transfer via Bridge component
3. Hook Processing → useNexusBridge prepares transaction data
4. Execution → useNexusBridgeExecute submits to Nexus
5. Verification → ZK-proofs verify transaction across chains
6. Update → useNexusBalance refreshes balances
```

## Key Benefits

- **No Bridging:** Direct cross-chain operations
- **Fast Transfers:** Seconds instead of 20-30 minutes
- **Single Interface:** Manage 10+ chains from one app
- **Secure:** ZK-proof verification
- **Developer-Friendly:** Simple SDK integration

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Cross-chain:** Avail Nexus SDK
- **Wallet:** WalletConnect / Web3 providers
- **Styling:** Tailwind CSS

---

## 📦 Project Structure

```
src/
├── lib/
│   └── nexus.ts              # Nexus SDK setup
├── contexts/
│   └── NexusContext.tsx      # Global Nexus state
├── hooks/
│   ├── useNexusBridge.tsx    # Bridge logic
│   ├── useNexusBridgeExecute.tsx
│   ├── useNexusBalance.tsx   # Balance queries
│   ├── useNexusTransfer.tsx  # Transfers
│   └── useNexusExecute.tsx   # Generic execution
├── components/
│   ├── Bridge.tsx            # Bridge UI
│   └── NexusInit.tsx         # Initialization
├── pages/
│   ├── Dashboard.tsx         # Portfolio view
│   └── Rebalance.tsx         # Rebalancing
└── utils/
    ├── swapCalculator.ts     # Swap calculations
    └── tokenBalanceUtils.ts  # Balance utilities
```

---
