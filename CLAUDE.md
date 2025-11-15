# CLAUDE.md - AI Assistant Guide

> **Comprehensive guide for AI assistants working on the Zuno Marketplace Scripts codebase**

This document provides a complete understanding of the codebase structure, development workflows, and conventions for AI assistants to effectively contribute to this project.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Overview](#architecture-overview)
3. [Directory Structure](#directory-structure)
4. [Core Concepts](#core-concepts)
5. [Development Workflow](#development-workflow)
6. [Code Conventions](#code-conventions)
7. [Common Tasks](#common-tasks)
8. [Testing & Debugging](#testing--debugging)
9. [Important Files Reference](#important-files-reference)
10. [Best Practices for AI Assistants](#best-practices-for-ai-assistants)
11. [Dependencies & External Systems](#dependencies--external-systems)
12. [Troubleshooting](#troubleshooting)

---

## Project Overview

### Purpose
**Zuno Marketplace Scripts** is a professional, production-ready CLI toolkit for testing and interacting with Zuno NFT Marketplace smart contracts. It provides an interactive command-line interface for developers to:

- Create ERC721 and ERC1155 NFT collections
- Mint NFTs (single and batch operations)
- List NFTs on the marketplace
- Buy NFTs from listings
- Create and manage auctions (English & Dutch)
- Create bundles and offers
- View analytics and collection statistics

### Technology Stack
- **Language**: TypeScript (strict mode enabled)
- **Runtime**: Node.js (>=18.0.0)
- **Package Manager**: pnpm
- **Blockchain Library**: ethers.js v6
- **CLI Framework**: inquirer.js v8
- **Module System**: CommonJS

### Key Features
- **Design Patterns**: Command Pattern, Strategy Pattern, Registry Pattern
- **Type Safety**: Full TypeScript with strict type checking
- **Modular Architecture**: Clean separation of concerns
- **Extensible**: Add new commands without modifying existing code
- **Interactive CLI**: Beautiful inquirer-based interface
- **API Integration**: Fetches ABIs and contract addresses from centralized API

---

## Architecture Overview

### Design Patterns

#### 1. Command Pattern
Each operation is encapsulated as a command class implementing the `ICommand` interface. This enables:
- **Open/Closed Principle**: Add new commands without modifying existing code
- **Consistent Interface**: All commands follow the same structure
- **Easy Testing**: Commands can be tested in isolation

**Implementation**:
```typescript
export class CreateERC721Command extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'create-erc721',
    description: 'Create a new ERC721 NFT Collection',
    category: 'collections',
    aliases: ['erc721', 'create721'],
  };

  async execute(context: CommandContext, args?: any): Promise<void> {
    // Implementation here
  }

  async getPrompts(): Promise<any[]> {
    // Return inquirer prompts for interactive mode
  }
}
```

#### 2. Registry Pattern
The `CommandRegistry` manages all available commands:
- Centralized command discovery
- Category-based organization
- Alias support
- Easy lookup and execution

**Location**: `src/core/CommandRegistry.ts`

#### 3. Strategy Pattern (ABI Provider)
The `IABIProvider` interface allows flexible ABI sourcing:
- **Current**: API-based provider fetching from `zuno-marketplace-abis` API
- **Flexible**: Can switch providers without changing command code
- **Cacheable**: Supports caching for performance

**Location**: `src/providers/abi/`

### System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         User Input                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    CLI (src/cli/index.ts)                   │
│  - Network Selection                                        │
│  - Account Selection                                        │
│  - Command Discovery                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              CommandRegistry (src/core/)                    │
│  - Route to appropriate command                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                Command Execution                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. Get CommandContext                                │  │
│  │    - ProviderContext (blockchain connection)         │  │
│  │    - ABIProvider (contract ABIs)                     │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 2. Fetch Contract ABI from API                       │  │
│  │    - APIABIProvider.getABI(contractName)             │  │
│  │    - Cache management                                │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 3. Interact with Smart Contract                      │  │
│  │    - Create contract instance (ethers.Contract)      │  │
│  │    - Execute blockchain transaction                  │  │
│  │    - Wait for confirmation                           │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Display Results                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
zuno-marketplace-scripts/
├── src/
│   ├── cli/                         # CLI entry point and user interface
│   │   ├── index.ts                 # Main CLI application class
│   │   ├── prompts.ts               # Inquirer prompt definitions
│   │   └── registerCommands.ts      # Command registration bootstrap
│   │
│   ├── commands/                    # Command implementations (Command Pattern)
│   │   ├── collections/             # Collection creation commands
│   │   │   ├── CreateERC721Command.ts
│   │   │   ├── CreateERC1155Command.ts
│   │   │   └── index.ts
│   │   ├── nfts/                    # NFT minting commands
│   │   │   ├── MintERC721Command.ts
│   │   │   ├── MintERC1155Command.ts
│   │   │   └── index.ts
│   │   ├── marketplace/             # Marketplace operations
│   │   │   ├── ListNFTCommand.ts
│   │   │   ├── BuyNFTCommand.ts
│   │   │   └── index.ts
│   │   ├── auctions/                # Auction commands
│   │   │   ├── CreateAuctionCommand.ts
│   │   │   ├── PlaceBidCommand.ts
│   │   │   └── index.ts
│   │   ├── bundles/                 # Bundle management
│   │   │   ├── CreateBundleCommand.ts
│   │   │   └── index.ts
│   │   ├── offers/                  # Offer creation
│   │   │   ├── CreateOfferCommand.ts
│   │   │   └── index.ts
│   │   ├── analytics/               # Analytics and stats
│   │   │   ├── CollectionStatsCommand.ts
│   │   │   └── index.ts
│   │   └── index.ts                 # Command exports
│   │
│   ├── core/                        # Core framework
│   │   ├── Command.interface.ts     # Base command interface and abstract class
│   │   └── CommandRegistry.ts       # Registry Pattern implementation
│   │
│   ├── providers/                   # Provider implementations
│   │   ├── ProviderContext.ts       # Blockchain provider context
│   │   └── abi/                     # ABI providers (Strategy Pattern)
│   │       ├── ABIProvider.interface.ts  # ABI provider interface
│   │       ├── APIABIProvider.ts         # API-based ABI provider
│   │       ├── abiApiClient.ts           # API client for fetching ABIs
│   │       ├── abiCacheManager.ts        # In-memory cache for ABIs
│   │       └── index.ts
│   │
│   ├── config/                      # Configuration
│   │   ├── network.config.ts        # Network configuration (fetched from API)
│   │   └── abiApiConfig.ts          # ABI API settings
│   │
│   ├── shared/                      # Shared resources
│   │   ├── abis/                    # Hardcoded ABIs (fallback)
│   │   │   └── collectionAbis.ts
│   │   ├── api/                     # API clients
│   │   │   └── zuno-api-client.ts
│   │   └── types/                   # Shared types
│   │       └── api.types.ts
│   │
│   ├── types/                       # TypeScript type definitions
│   │   └── index.ts                 # Centralized type exports
│   │
│   ├── utils/                       # Utility functions
│   │   ├── logger.utils.ts          # Logging utilities
│   │   ├── nft.utils.ts             # NFT-related helpers
│   │   ├── validation.utils.ts      # Validation functions
│   │   ├── abiValidatorUtils.ts     # ABI validation
│   │   └── index.ts
│   │
│   ├── errors/                      # Custom error classes
│   │   └── abiProviderErrors.ts
│   │
│   └── index.ts                     # Main entry point (CLI launcher)
│
├── dist/                            # Compiled JavaScript (gitignored)
├── node_modules/                    # Dependencies (gitignored)
├── .env                             # Environment variables (gitignored)
├── .env.example                     # Example environment configuration
├── package.json                     # Package metadata and dependencies
├── tsconfig.json                    # TypeScript configuration
├── pnpm-lock.yaml                   # Lockfile for pnpm
├── README.md                        # User-facing documentation
├── CLAUDE.md                        # This file - AI assistant guide
└── .gitignore                       # Git ignore rules
```

### Key Directory Purposes

- **`src/cli/`**: User interface layer - handles all user interactions and CLI orchestration
- **`src/commands/`**: Business logic layer - each command is self-contained
- **`src/core/`**: Framework layer - reusable abstractions and patterns
- **`src/providers/`**: Infrastructure layer - external system integrations
- **`src/config/`**: Configuration layer - network and API settings
- **`src/types/`**: Type definitions - centralized TypeScript types
- **`src/utils/`**: Utility layer - reusable helper functions

---

## Core Concepts

### 1. Command Context

Every command receives a `CommandContext` object containing:

```typescript
interface CommandContext {
  provider: ProviderContext;  // Blockchain connection
  abiProvider: IABIProvider;  // ABI fetching strategy
}

interface ProviderContext {
  provider: ethers.JsonRpcProvider;  // RPC provider
  signer: ethers.Signer;            // Account signer
  account: string;                   // Connected account address
  config: NetworkConfig;             // Network configuration
  addresses: ContractAddresses;      // Deployed contract addresses
}
```

**Location**: `src/types/index.ts:87-104`

### 2. BaseCommand Abstract Class

All commands extend `BaseCommand`:

```typescript
export abstract class BaseCommand implements ICommand {
  abstract metadata: CommandMetadata;
  abstract execute(context: CommandContext, args?: any): Promise<void>;
  async getPrompts?(): Promise<any[]>;  // Optional: for interactive mode

  // Protected helpers
  protected logStart(): void;
  protected logSuccess(message?: string): void;
  protected logError(error: Error): void;
}
```

**Location**: `src/core/Command.interface.ts:12-66`

**Key Methods**:
- `execute()`: Core command logic (required)
- `getPrompts()`: Returns inquirer prompts for interactive mode (optional)
- `logStart()`, `logSuccess()`, `logError()`: Consistent logging

### 3. ABI Provider System

The ABI provider abstracts contract ABI fetching:

```typescript
interface IABIProvider {
  getABI(contractName: string, options?: ABIFetchOptions): Promise<any>;
  getContractInterface(contractName: string): Promise<ethers.Interface>;
}
```

**Current Implementation**: `APIABIProvider`
- Fetches ABIs from `zuno-marketplace-abis` API
- Includes in-memory caching (5-minute TTL)
- Supports version pinning via `ABI_VERSION` env var
- Validates ABIs before returning

**Location**: `src/providers/abi/APIABIProvider.ts`

### 4. Network Configuration

Networks are fetched dynamically from the ABI API:

- **Local**: Anvil local testnet (http://127.0.0.1:8545)
- **Sepolia**: Sepolia testnet
- **Mainnet**: Ethereum mainnet

Network configs include:
- `id`: Network ID from API (for fetching contracts)
- `rpcUrl`: RPC endpoint
- `chainId`: Chain ID

**Location**: `src/config/network.config.ts`

### 5. Contract Address Resolution

Contract addresses are fetched from the API based on network ID:

```typescript
// Automatically fetched for each network
interface ContractAddresses {
  erc721Factory: string;
  erc1155Factory: string;
  erc721Exchange: string;
  erc1155Exchange: string;
  auctionFactory: string;
  feeRegistry: string;
  bundleManager: string;
  offerManager: string;
  listingHistoryTracker: string;
}
```

**Location**: `src/providers/ProviderContext.ts:111-183`

---

## Development Workflow

### Adding a New Command

Follow these steps to add a new command (example: `CancelListingCommand`):

#### Step 1: Create Command File

Create `src/commands/marketplace/CancelListingCommand.ts`:

```typescript
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { ethers } from 'ethers';
import { logger } from '@utils';
import { waitForTransaction } from '@providers/ProviderContext';

export class CancelListingCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'cancel-listing',
    description: 'Cancel an active NFT listing',
    category: 'marketplace',
    aliases: ['cancel', 'unlist'],
  };

  async execute(context: CommandContext, args?: any): Promise<void> {
    this.logStart();

    try {
      const { provider, abiProvider } = context;

      // 1. Get contract address
      const exchangeAddress = provider.addresses.erc721Exchange;
      logger.info(`Exchange: ${exchangeAddress}`);

      // 2. Fetch ABI from API
      const exchangeABI = await abiProvider.getABI('ERC721NFTExchange');

      // 3. Create contract instance
      const exchange = new ethers.Contract(
        exchangeAddress,
        exchangeABI,
        provider.signer
      );

      // 4. Execute transaction
      logger.info('Cancelling listing...');
      const tx = await exchange.cancelListing(args.listingId);
      await waitForTransaction(tx, 'Cancel Listing');

      this.logSuccess('Listing cancelled successfully!');
    } catch (error) {
      this.logError(error as Error);
      throw error;
    }
  }

  async getPrompts(): Promise<any[]> {
    return [
      {
        type: 'input',
        name: 'listingId',
        message: 'Listing ID to cancel:',
        validate: (input: string) => {
          return input.length > 0 || 'Listing ID is required';
        },
      },
    ];
  }
}
```

#### Step 2: Export from Category Index

Update `src/commands/marketplace/index.ts`:

```typescript
export { ListNFTCommand } from './ListNFTCommand';
export { BuyNFTCommand } from './BuyNFTCommand';
export { CancelListingCommand } from './CancelListingCommand';  // Add this
```

#### Step 3: Register Command

Update `src/cli/registerCommands.ts`:

```typescript
import {
  ListNFTCommand,
  BuyNFTCommand,
  CancelListingCommand  // Import
} from '@commands/marketplace';

export function registerAllCommands(): void {
  // ... existing commands

  // Marketplace commands
  commandRegistry.register(new ListNFTCommand());
  commandRegistry.register(new BuyNFTCommand());
  commandRegistry.register(new CancelListingCommand());  // Register
}
```

#### Step 4: Test

```bash
# Build
pnpm run build

# Run CLI
pnpm start

# Select network -> marketplace -> cancel-listing
```

### Modifying Existing Commands

When modifying existing commands:

1. **Read the command file first** to understand its current implementation
2. **Preserve the command metadata** (name, category) unless explicitly renaming
3. **Maintain backward compatibility** if the command is used programmatically
4. **Update prompts** in `getPrompts()` if adding/changing parameters
5. **Use the logger utilities** for consistent output
6. **Handle errors gracefully** with try-catch and `logError()`

### Adding New Types

Add new types to `src/types/index.ts`:

```typescript
// Example: Adding auction types
export interface BidParams {
  auctionId: string;
  amount: string;
  bidder?: string;
}

export interface AuctionInfo {
  auctionId: string;
  nftAddress: string;
  tokenId: string;
  seller: string;
  highestBidder?: string;
  highestBid: bigint;
  endTime: number;
  settled: boolean;
}
```

Keep types organized by category (Network, Provider, Command, NFT, Marketplace, etc.)

---

## Code Conventions

### TypeScript Guidelines

#### 1. Strict Mode
All TypeScript strict checks are enabled:
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noUncheckedIndexedAccess": true
}
```

**Implications**:
- Always type function parameters and return values
- Handle `undefined` and `null` explicitly
- Array access returns `T | undefined`

#### 2. Path Aliases
Use TypeScript path aliases for imports:

```typescript
// ✅ Good
import { BaseCommand } from '@core/Command.interface';
import { logger } from '@utils';
import { CommandContext } from '@types';

// ❌ Avoid
import { BaseCommand } from '../../core/Command.interface';
```

**Available Aliases** (`tsconfig.json:44-52`):
- `@/*` → `src/*`
- `@cli/*` → `src/cli/*`
- `@commands/*` → `src/commands/*`
- `@core/*` → `src/core/*`
- `@providers/*` → `src/providers/*`
- `@types` → `src/types/index`
- `@utils` → `src/utils/index`
- `@config/*` → `src/config/*`

#### 3. Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Classes | PascalCase | `CreateERC721Command` |
| Interfaces | PascalCase with `I` prefix for core interfaces | `ICommand`, `IABIProvider` |
| Types | PascalCase | `NetworkName`, `CommandContext` |
| Functions | camelCase | `createProviderContext()` |
| Variables | camelCase | `exchangeAddress` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_NETWORK` |
| Files (classes) | PascalCase.ts | `CreateERC721Command.ts` |
| Files (modules) | camelCase.ts | `network.config.ts` |

#### 4. Import Order

Organize imports in this order:

```typescript
// 1. External dependencies
import { ethers } from 'ethers';
import inquirer from 'inquirer';

// 2. Core/framework imports
import { BaseCommand } from '@core/Command.interface';
import { commandRegistry } from '@core/CommandRegistry';

// 3. Type imports
import { CommandMetadata, CommandContext } from '@types';

// 4. Provider imports
import { createProviderContext } from '@providers/ProviderContext';

// 5. Utility imports
import { logger } from '@utils';

// 6. Local imports
import { formatCollectionParams } from './helpers';
```

#### 5. Async/Await

Always use `async/await` instead of `.then()`:

```typescript
// ✅ Good
async execute(context: CommandContext): Promise<void> {
  const abi = await context.abiProvider.getABI('ERC721Factory');
  const tx = await contract.createCollection(params);
  const receipt = await tx.wait();
}

// ❌ Avoid
execute(context: CommandContext): Promise<void> {
  return context.abiProvider.getABI('ERC721Factory')
    .then(abi => contract.createCollection(params))
    .then(tx => tx.wait());
}
```

### Logging Conventions

Use the logger utility from `@utils`:

```typescript
import { logger } from '@utils';

// Info messages
logger.info('Fetching contract ABI...');

// Success messages
logger.success('Transaction confirmed!');

// Warnings
logger.warning('Gas price is high');

// Errors
logger.error('Transaction failed');

// Debug (only shown if DEBUG=true)
logger.debug('Contract call result:', result);

// Sections
logger.section('Creating Collection');

// Subsections
logger.subsection('Verification');

// Spacing
logger.space();
```

**Location**: `src/utils/logger.utils.ts:71-100`

### Error Handling

Follow this pattern for error handling in commands:

```typescript
async execute(context: CommandContext, args?: any): Promise<void> {
  this.logStart();

  try {
    // Command logic here

    this.logSuccess('Operation completed!');
  } catch (error) {
    this.logError(error as Error);
    throw error;  // Re-throw for CLI to handle
  }
}
```

**Important**:
- Always catch errors in `execute()`
- Log errors using `this.logError()`
- Re-throw errors for the CLI layer to handle
- The CLI (`src/cli/index.ts:131-142`) handles top-level error display

---

## Common Tasks

### Task 1: Fetching ABIs

To fetch a contract ABI from the API:

```typescript
// Within a command
const abi = await context.abiProvider.getABI('ERC721CollectionFactory');

// With options
const abi = await context.abiProvider.getABI('ERC721CollectionFactory', {
  version: '1.0.0',     // Specific version
  bypassCache: true,    // Skip cache
});

// Get ethers Interface
const iface = await context.abiProvider.getContractInterface('ERC721Factory');
```

**Available Contracts** (query from API):
- `ERC721CollectionFactory`
- `ERC1155CollectionFactory`
- `ERC721NFTExchange`
- `ERC1155NFTExchange`
- `AuctionFactory`
- `FeeRegistry`
- `BundleManager`
- `OfferManager`
- `ListingHistoryTracker`

### Task 2: Creating Contract Instances

```typescript
import { ethers } from 'ethers';

// Get ABI and address
const factoryABI = await context.abiProvider.getABI('ERC721CollectionFactory');
const factoryAddress = context.provider.addresses.erc721Factory;

// Create contract with signer (for transactions)
const factory = new ethers.Contract(
  factoryAddress,
  factoryABI,
  context.provider.signer
);

// Create read-only contract (for queries)
const factoryReadOnly = new ethers.Contract(
  factoryAddress,
  factoryABI,
  context.provider.provider
);
```

### Task 3: Executing Transactions

```typescript
import { waitForTransaction } from '@providers/ProviderContext';

// Execute transaction
const tx = await contract.someFunction(arg1, arg2);

// Wait for confirmation with logging
const receipt = await waitForTransaction(tx, 'Operation Description');

// Parse events from receipt
for (const log of receipt.logs) {
  try {
    const parsed = contract.interface.parseLog({
      topics: log.topics as string[],
      data: log.data,
    });

    if (parsed?.name === 'EventName') {
      const eventArg = parsed.args[0];
      logger.info(`Event emitted: ${eventArg}`);
    }
  } catch {
    // Not our event, skip
  }
}
```

### Task 4: Working with BigInt and Ethers

```typescript
import { ethers } from 'ethers';

// Converting ETH to wei
const priceInWei = ethers.parseEther('0.01');  // 10000000000000000n

// Converting wei to ETH
const priceInEth = ethers.formatEther(priceInWei);  // "0.01"

// Working with BigInt
const totalPrice = priceInWei * BigInt(quantity);

// Comparing BigInt
if (balance >= priceInWei) {
  // Sufficient balance
}

// Converting basis points (for royalties)
const royaltyFee = 500;  // 5% in basis points
const royaltyPercentage = royaltyFee / 100;  // 5
```

### Task 5: Adding Prompts

Use inquirer types for interactive prompts:

```typescript
async getPrompts(): Promise<any[]> {
  return [
    // Text input
    {
      type: 'input',
      name: 'address',
      message: 'Contract address:',
      default: '0x...',
      validate: (input: string) => {
        return ethers.isAddress(input) || 'Invalid address';
      },
    },

    // Number input
    {
      type: 'number',
      name: 'quantity',
      message: 'Quantity to mint:',
      default: 1,
      validate: (input: number) => {
        return input > 0 || 'Must be greater than 0';
      },
    },

    // Confirm (yes/no)
    {
      type: 'confirm',
      name: 'proceed',
      message: 'Proceed with transaction?',
      default: true,
    },

    // List (selection)
    {
      type: 'list',
      name: 'auctionType',
      message: 'Select auction type:',
      choices: ['english', 'dutch'],
      default: 'english',
    },
  ];
}
```

---

## Testing & Debugging

### Running the CLI

```bash
# Development mode (with auto-reload)
pnpm run dev

# Build and run
pnpm run build
pnpm start

# Type checking only
pnpm run typecheck
```

### Debug Mode

Enable debug logging:

```bash
# In .env file
DEBUG=true

# Or inline
DEBUG=true pnpm start
```

Debug logs are controlled by `logger.debug()` and only shown when `DEBUG=true`.

**Location**: `src/utils/logger.utils.ts:76-80`

### Testing Commands Programmatically

Commands can be used programmatically (not just via CLI):

```typescript
import { createProviderContext } from '@providers/ProviderContext';
import { createABIProvider } from '@providers/abi';
import { CreateERC721Command } from '@commands/collections';

async function testCommand() {
  // Create context
  const provider = await createProviderContext('local', 0);
  const abiProvider = createABIProvider();

  const context = { provider, abiProvider };

  // Create and execute command
  const command = new CreateERC721Command();
  await command.execute(context, {
    name: 'Test Collection',
    symbol: 'TEST',
    maxSupply: 1000,
  });
}
```

### Common Debugging Steps

1. **Check network connection**:
   ```bash
   curl http://127.0.0.1:8545 -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
   ```

2. **Verify API connectivity**:
   ```bash
   curl -H "x-api-key: YOUR_KEY" http://localhost:3000/api/networks
   ```

3. **Check ABI cache**:
   - Cache is in-memory (not persisted)
   - TTL: 5 minutes (300000ms)
   - Location: `src/providers/abi/abiCacheManager.ts`

4. **Inspect transaction errors**:
   - Enable DEBUG mode
   - Check error.reason or error.message
   - Review contract revert messages

---

## Important Files Reference

### Critical Files to Understand

| File | Purpose | When to Modify |
|------|---------|----------------|
| `src/index.ts` | CLI entry point | Never (stable) |
| `src/cli/index.ts` | Main CLI application | Adding CLI features |
| `src/cli/registerCommands.ts` | Command registration | Every new command |
| `src/core/Command.interface.ts` | Base command interface | Adding command capabilities |
| `src/core/CommandRegistry.ts` | Command registry | Adding registry features |
| `src/providers/ProviderContext.ts` | Blockchain provider setup | Network/provider changes |
| `src/providers/abi/APIABIProvider.ts` | ABI fetching logic | Changing ABI source |
| `src/types/index.ts` | Type definitions | Adding new types |
| `src/config/network.config.ts` | Network configuration | Network changes |
| `src/config/abiApiConfig.ts` | ABI API configuration | API endpoint changes |

### Files by Use Case

**Adding a new command**:
1. Create `src/commands/{category}/{CommandName}Command.ts`
2. Update `src/commands/{category}/index.ts`
3. Update `src/cli/registerCommands.ts`
4. (Optional) Add types to `src/types/index.ts`

**Modifying ABI fetching**:
1. `src/providers/abi/APIABIProvider.ts` - Main provider
2. `src/providers/abi/abiApiClient.ts` - API client
3. `src/providers/abi/abiCacheManager.ts` - Caching logic

**Changing network configuration**:
1. `src/config/network.config.ts` - Network definitions
2. `.env` - API credentials and settings

**Adding utilities**:
1. Create file in `src/utils/`
2. Export from `src/utils/index.ts`

---

## Best Practices for AI Assistants

### Do's ✅

1. **Read Before Writing**
   - Always read existing command files to understand patterns
   - Check `src/types/index.ts` for existing types before creating new ones
   - Review similar commands for consistency

2. **Follow Existing Patterns**
   - Extend `BaseCommand` for new commands
   - Use `CommandContext` for all command parameters
   - Follow the `execute()` → `logStart()` → logic → `logSuccess()` flow

3. **Use Path Aliases**
   - Use `@core/*`, `@commands/*`, etc. instead of relative paths
   - Keeps imports clean and maintainable

4. **Type Everything**
   - TypeScript strict mode is enabled
   - Add explicit types for parameters and return values
   - Use existing types from `@types` when possible

5. **Consistent Logging**
   - Use `logger` utility, not `console.log()`
   - Use `logger.info()` for status, `logger.success()` for completion
   - Use `logger.error()` for errors

6. **Handle Errors Gracefully**
   - Wrap `execute()` in try-catch
   - Log errors with `this.logError()`
   - Re-throw for CLI to handle

7. **Test After Changes**
   - Run `pnpm run build` to check for TypeScript errors
   - Run `pnpm start` to test interactively
   - Verify the command works end-to-end

8. **Document Complex Logic**
   - Add comments for non-obvious code
   - Explain why, not what
   - Use JSDoc for public APIs

### Don'ts ❌

1. **Don't Modify Core Files Without Understanding Impact**
   - `src/core/Command.interface.ts` affects ALL commands
   - `src/core/CommandRegistry.ts` affects command discovery
   - Changes here require testing all commands

2. **Don't Hardcode Contract Addresses**
   - Use `context.provider.addresses.{contractName}`
   - Addresses are fetched from API per network

3. **Don't Hardcode ABIs**
   - Use `context.abiProvider.getABI(contractName)`
   - ABIs are centrally managed via API

4. **Don't Use `.then()` Instead of `async/await`**
   - Codebase uses modern async/await everywhere
   - Keep consistency

5. **Don't Ignore TypeScript Errors**
   - Strict mode is enabled for a reason
   - Fix type errors, don't use `any` or `@ts-ignore`

6. **Don't Create Duplicate Utilities**
   - Check `src/utils/` before creating new helpers
   - Reuse existing functions

7. **Don't Skip Error Handling**
   - Blockchain operations can fail
   - Always wrap in try-catch

8. **Don't Commit `.env` Files**
   - `.env` is gitignored
   - Use `.env.example` for documentation

### Working with Blockchain Operations

1. **Always validate addresses**:
   ```typescript
   if (!ethers.isAddress(address)) {
     throw new Error('Invalid address');
   }
   ```

2. **Check balances before transactions**:
   ```typescript
   const balance = await provider.getBalance(account);
   if (balance < totalCost) {
     throw new Error('Insufficient balance');
   }
   ```

3. **Parse BigInt correctly**:
   ```typescript
   // Use ethers helpers
   const wei = ethers.parseEther(ethString);
   const eth = ethers.formatEther(weiValue);
   ```

4. **Wait for confirmations**:
   ```typescript
   const tx = await contract.method();
   const receipt = await waitForTransaction(tx, 'Description');
   // Now transaction is confirmed
   ```

### Code Review Checklist

Before submitting changes, verify:

- [ ] TypeScript compiles without errors (`pnpm run build`)
- [ ] All imports use path aliases
- [ ] New command is registered in `registerCommands.ts`
- [ ] Error handling is in place
- [ ] Logging uses `logger` utility
- [ ] No hardcoded addresses or ABIs
- [ ] Types are defined in `src/types/index.ts`
- [ ] Command has `getPrompts()` for interactive mode
- [ ] Transaction results are logged clearly

---

## Dependencies & External Systems

### External API: `zuno-marketplace-abis`

The CLI depends on a centralized ABI API for:
- Contract ABIs
- Deployed contract addresses
- Network configurations

**API Endpoints**:
- `GET /api/abis/full?contractName={name}` - Fetch ABI by contract name
- `GET /api/networks` - List all networks
- `GET /api/networks/{networkId}/contracts` - Get deployed contracts for network

**Configuration** (`.env`):
```bash
ABI_API_URL=http://localhost:3000
ABI_API_KEY=your-api-key-here
ABI_VERSION=1.0.0  # or 'latest'
ABI_CACHE_ENABLED=true
ABI_CACHE_TTL=300000  # 5 minutes
```

**Location**: `src/config/abiApiConfig.ts`

### Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `ethers` | ^6.15.0 | Blockchain interactions |
| `inquirer` | ^8.2.7 | Interactive CLI prompts |
| `dotenv` | ^17.2.3 | Environment variables |
| `typescript` | ^5.9.3 | Type safety |
| `tsx` | ^4.20.6 | TypeScript execution |

**Package Manager**: pnpm (lockfile: `pnpm-lock.yaml`)

### Environment Variables

Required variables (see `.env.example`):

```bash
# Required
ABI_API_URL=http://localhost:3000
ABI_API_KEY=your-api-key-here

# Optional (with defaults)
ABI_VERSION=1.0.0          # Default: latest
ABI_CACHE_ENABLED=true     # Default: true
ABI_CACHE_TTL=300000       # Default: 300000 (5 min)
DEBUG=false                # Default: false
```

**Note**: RPC URLs are configured in `src/config/network.config.ts`, not `.env`.

---

## Troubleshooting

### Issue: "No accounts found"

**Cause**: Network is not running or RPC URL is incorrect

**Solution**:
```bash
# Check if local network is running
curl http://127.0.0.1:8545 -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_accounts","params":[],"id":1}'

# Start local network (Anvil)
anvil
```

### Issue: "Failed to fetch contract addresses"

**Cause**: ABI API is not accessible or network not registered

**Solution**:
1. Check ABI API is running: `curl http://localhost:3000/api/networks`
2. Verify `ABI_API_URL` and `ABI_API_KEY` in `.env`
3. Ensure network exists in API database

### Issue: "Contract ABI not found: {ContractName}"

**Cause**: Contract not registered in ABI API

**Solution**:
1. Check available contracts: `curl -H "x-api-key: KEY" http://localhost:3000/api/abis/full?limit=100`
2. Verify contract name spelling (case-sensitive)
3. Register contract in ABI API if missing

### Issue: TypeScript errors after adding new command

**Cause**: Missing types or incorrect imports

**Solution**:
1. Run `pnpm run typecheck` to see all errors
2. Check that imports use path aliases (`@core/*` not `../../core`)
3. Ensure all types are imported from `@types`
4. Check `tsconfig.json` paths are correct

### Issue: "Transaction reverted"

**Cause**: Smart contract rejected the transaction

**Solution**:
1. Enable `DEBUG=true` in `.env` for full stack traces
2. Check transaction parameters match contract expectations
3. Verify account has sufficient balance
4. Check contract state (e.g., is NFT already listed?)

### Issue: Command not appearing in CLI

**Cause**: Command not registered

**Solution**:
1. Check command is imported in `src/cli/registerCommands.ts`
2. Verify `commandRegistry.register(new YourCommand())` is called
3. Check `metadata.category` matches expected category
4. Rebuild: `pnpm run build`

### Issue: Cache showing stale data

**Cause**: ABI cache has 5-minute TTL

**Solution**:
```typescript
// Bypass cache for specific request
const abi = await context.abiProvider.getABI('ContractName', {
  bypassCache: true,
});

// Or restart CLI (clears in-memory cache)
```

---

## Additional Resources

### Related Repositories

- **zuno-marketplace-abis**: Centralized ABI and contract address API
- **zuno-marketplace-contracts**: Smart contract implementations

### Useful Commands

```bash
# Install dependencies
pnpm install

# Development mode
pnpm run dev

# Build TypeScript
pnpm run build

# Type check without building
pnpm run typecheck

# Clean build artifacts
rm -rf dist/

# Run CLI
pnpm start
```

### Debugging Tips

1. **Enable verbose logging**:
   ```bash
   DEBUG=true pnpm start
   ```

2. **Check transaction details**:
   ```typescript
   const tx = await contract.method();
   console.log('Transaction:', tx);
   const receipt = await tx.wait();
   console.log('Receipt:', receipt);
   ```

3. **Inspect contract state**:
   ```typescript
   const owner = await contract.owner();
   const balance = await contract.balanceOf(address);
   logger.debug('Owner:', owner);
   logger.debug('Balance:', balance.toString());
   ```

4. **Test ABI fetching**:
   ```typescript
   const abi = await context.abiProvider.getABI('ERC721Factory', {
     bypassCache: true,
   });
   logger.debug('ABI:', JSON.stringify(abi, null, 2));
   ```

---

## Summary

This guide provides a comprehensive overview of the Zuno Marketplace Scripts codebase for AI assistants. Key takeaways:

✅ **Architecture**: Command Pattern + Strategy Pattern + Registry Pattern
✅ **Type Safety**: Strict TypeScript with comprehensive type definitions
✅ **Modularity**: Commands are self-contained and easy to add
✅ **API Integration**: ABIs and addresses fetched from centralized API
✅ **Consistency**: Use path aliases, logger utility, and established patterns
✅ **Error Handling**: Always catch, log, and re-throw errors

When in doubt, **look at existing command implementations** for reference. The codebase is designed to be predictable and consistent.

---

**Last Updated**: 2025-11-15
**Version**: 2.0.0
**Maintainer**: AI Assistant Documentation
