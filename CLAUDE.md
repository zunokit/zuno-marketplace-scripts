# CLAUDE.md - AI Assistant Guide for Zuno Marketplace Scripts

## Project Overview

**Zuno Marketplace Scripts** is a professional, production-ready CLI toolkit for testing and interacting with Zuno NFT Marketplace smart contracts. Built with TypeScript using enterprise-grade design patterns for scalability, maintainability, and extensibility.

### Key Information
- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js >= 18.0.0
- **Package Manager**: pnpm (preferred), npm supported
- **Module System**: CommonJS
- **Blockchain Library**: ethers.js v6.15.0
- **CLI Framework**: inquirer v8.2.7

### Project Purpose
This CLI provides interactive commands for:
- Creating NFT collections (ERC721/ERC1155)
- Minting NFTs (batch support)
- Marketplace operations (list, buy, sell)
- Auctions (English/Dutch)
- Bundles and Offers
- Collection analytics

## Repository Structure

```
zuno-marketplace-scripts/
├── src/
│   ├── cli/                      # CLI application & prompts
│   │   ├── index.ts             # Main CLI application class
│   │   ├── prompts.ts           # Interactive inquirer prompts
│   │   └── registerCommands.ts  # Command registration
│   │
│   ├── commands/                # Command implementations (Command Pattern)
│   │   ├── analytics/           # Collection statistics
│   │   ├── auctions/            # Auction creation & bidding
│   │   ├── bundles/             # Bundle management
│   │   ├── collections/         # ERC721/ERC1155 factory commands
│   │   ├── marketplace/         # List & buy operations
│   │   ├── nfts/               # Minting operations
│   │   ├── offers/             # Offer creation
│   │   └── index.ts            # Command exports
│   │
│   ├── core/                    # Core framework
│   │   ├── Command.interface.ts # Base command interface & abstract class
│   │   └── CommandRegistry.ts   # Registry pattern for command discovery
│   │
│   ├── providers/               # Provider implementations
│   │   ├── abi/                # ABI provider (Strategy Pattern)
│   │   │   ├── ABIProvider.interface.ts  # Base interface
│   │   │   ├── APIABIProvider.ts        # API-based implementation
│   │   │   ├── abiApiClient.ts          # HTTP client for ABI API
│   │   │   ├── abiCacheManager.ts       # In-memory caching
│   │   │   └── index.ts                 # Provider factory
│   │   └── ProviderContext.ts   # Blockchain provider & signer management
│   │
│   ├── config/                  # Configuration
│   │   ├── abiApiConfig.ts     # ABI API settings
│   │   └── network.config.ts   # Network configurations (local/sepolia/mainnet)
│   │
│   ├── shared/                  # Shared resources
│   │   ├── abis/               # Static ABI definitions
│   │   ├── api/                # Zuno API client
│   │   └── types/              # API DTOs
│   │
│   ├── types/                   # TypeScript type definitions
│   │   └── index.ts            # Centralized type exports
│   │
│   ├── utils/                   # Utility functions
│   │   ├── abiValidatorUtils.ts # ABI validation
│   │   ├── logger.utils.ts      # Logging helpers
│   │   ├── nft.utils.ts         # NFT helper functions
│   │   ├── validation.utils.ts  # Input validation
│   │   └── index.ts             # Utility exports
│   │
│   ├── errors/                  # Custom error classes
│   │   └── abiProviderErrors.ts
│   │
│   └── index.ts                 # Main entry point & CLI launcher
│
├── .env.example                 # Environment configuration template
├── .gitignore                   # Git ignore rules
├── package.json                 # Dependencies & scripts
├── tsconfig.json                # TypeScript configuration
├── pnpm-lock.yaml              # Lock file
└── README.md                    # User documentation
```

## Architecture Patterns

### 1. Command Pattern
Each operation is encapsulated as a command class implementing `ICommand` interface.

**Key Files:**
- `src/core/Command.interface.ts` - Base interface and abstract class
- `src/core/CommandRegistry.ts` - Central command registry

**Command Structure:**
```typescript
export class CreateERC721Command extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'create-erc721',
    description: 'Create a new ERC721 NFT Collection',
    category: 'collections',
    aliases: ['erc721', 'create721'],
  };

  async execute(context: CommandContext, args?: any): Promise<void> {
    // Implementation
  }

  async getPrompts(): Promise<any[]> {
    // Return inquirer prompts for interactive mode
    return [/* prompt objects */];
  }
}
```

**Benefits:**
- Add new commands without modifying existing code (Open/Closed Principle)
- Consistent interface across all operations
- Easy to test and maintain
- Support for both interactive and programmatic usage

### 2. Strategy Pattern (ABI Provider)
Flexible ABI sourcing that can switch between different implementations.

**Key Files:**
- `src/providers/abi/ABIProvider.interface.ts` - Base interface
- `src/providers/abi/APIABIProvider.ts` - API-based implementation
- `src/providers/abi/abiCacheManager.ts` - Caching layer

**Current Implementation:**
- API-based ABI fetching from `zuno-marketplace-abis` service
- Intelligent caching with TTL
- Retry logic with exponential backoff
- Version control support (latest or pinned versions)

### 3. Registry Pattern
Central registry for command discovery and execution.

**Key File:** `src/core/CommandRegistry.ts`

**Features:**
- Command registration by name and aliases
- Category-based organization
- Command lookup and discovery
- Duplicate prevention

### 4. Provider Context Pattern
Manages blockchain provider, signer, and network configuration.

**Key File:** `src/providers/ProviderContext.ts`

**Responsibilities:**
- Provider initialization (ethers.js)
- Account/signer management
- Network configuration
- Contract address fetching from API

## TypeScript Configuration

**Path Aliases** (tsconfig.json):
```json
{
  "@/*": ["./src/*"],
  "@cli/*": ["./src/cli/*"],
  "@commands/*": ["./src/commands/*"],
  "@core/*": ["./src/core/*"],
  "@providers/*": ["./src/providers/*"],
  "@types": ["./src/types/index"],
  "@utils": ["./src/utils/index"],
  "@config/*": ["./src/config/*"]
}
```

**Strict Mode Enabled:**
- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noUncheckedIndexedAccess: true`

**Always use path aliases for imports**, not relative paths.

## Development Workflows

### Adding a New Command

**Step 1: Create Command Class**

Create a new file in the appropriate category folder (e.g., `src/commands/marketplace/CancelListingCommand.ts`):

```typescript
import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { logger } from '@utils';

export class CancelListingCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'cancel-listing',
    description: 'Cancel an active marketplace listing',
    category: 'marketplace',
    aliases: ['cancel'],
  };

  async execute(context: CommandContext, args?: any): Promise<void> {
    this.logStart();

    try {
      // 1. Get contract address from context
      const exchangeAddress = context.provider.addresses.erc721Exchange;

      // 2. Get ABI from provider
      const abi = await context.abiProvider.getABI('ERC721NFTExchange');

      // 3. Create contract instance
      const exchange = new ethers.Contract(
        exchangeAddress,
        abi,
        context.provider.signer
      );

      // 4. Execute contract call
      logger.info('Canceling listing...');
      const tx = await exchange.cancelListing(args.listingId);
      await tx.wait();

      this.logSuccess('Listing canceled successfully!');
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
          return input.trim() !== '' || 'Listing ID is required';
        }
      }
    ];
  }
}
```

**Step 2: Export from Category Index**

Add to `src/commands/marketplace/index.ts`:
```typescript
export { CancelListingCommand } from './CancelListingCommand';
```

**Step 3: Register Command**

Add to `src/cli/registerCommands.ts`:
```typescript
import { CancelListingCommand } from '@commands/marketplace';

export function registerAllCommands(): void {
  // ... existing commands
  commandRegistry.register(new CancelListingCommand());
}
```

**That's it!** The command is now available in the CLI.

### Adding a New Type

Add types to `src/types/index.ts`:
```typescript
export interface CancelListingParams {
  listingId: string;
  nftAddress: string;
}
```

### Adding a New Utility

Add to appropriate file in `src/utils/` and export from `src/utils/index.ts`:
```typescript
// src/utils/marketplace.utils.ts
export function formatListingId(id: string | number): string {
  return `#${id}`;
}

// src/utils/index.ts
export * from './marketplace.utils';
```

## Key Conventions

### Code Style

1. **Imports**: Always use path aliases, not relative paths
   ```typescript
   // Good
   import { logger } from '@utils';
   import { BaseCommand } from '@core/Command.interface';

   // Bad
   import { logger } from '../../utils';
   import { BaseCommand } from '../core/Command.interface';
   ```

2. **Logging**: Use the logger utility for all console output
   ```typescript
   import { logger } from '@utils';

   logger.info('Processing...');
   logger.success('Done!');
   logger.warning('Be careful');
   logger.error('Something went wrong');
   logger.debug('Debug info'); // Only shows when DEBUG=true

   logger.section('Section Title');
   logger.subsection('Subsection');
   logger.space(); // Empty line
   ```

3. **Error Handling**: Always wrap execute in try/catch
   ```typescript
   async execute(context: CommandContext, args?: any): Promise<void> {
     this.logStart();

     try {
       // Implementation
       this.logSuccess('Operation completed');
     } catch (error) {
       this.logError(error as Error);
       throw error; // Re-throw for CLI to handle
     }
   }
   ```

4. **Transaction Handling**: Use the waitForTransaction helper
   ```typescript
   import { waitForTransaction } from '@providers/ProviderContext';

   const tx = await contract.someMethod(args);
   const receipt = await waitForTransaction(tx, 'Operation Name');
   ```

5. **ABI Fetching**: Always fetch ABIs from the provider
   ```typescript
   // Good
   const abi = await context.abiProvider.getABI('ERC721NFTExchange');

   // Bad - don't hardcode ABIs in commands
   const abi = [/* hardcoded ABI */];

   // Exception: Shared ABIs in src/shared/abis/ can be used for verification
   import { ERC721_COLLECTION_ABI } from '@/shared/abis/collectionAbis';
   ```

6. **Contract Addresses**: Get from provider context, never hardcode
   ```typescript
   // Good
   const factoryAddress = context.provider.addresses.erc721Factory;

   // Bad
   const factoryAddress = '0x123...';
   ```

### Naming Conventions

- **Commands**: `{Action}{Entity}Command.ts` (e.g., `CreateERC721Command.ts`)
- **Interfaces**: Prefix with `I` (e.g., `ICommand`, `IABIProvider`)
- **Types**: PascalCase (e.g., `CommandContext`, `NetworkName`)
- **Enums**: PascalCase with UPPER_CASE values (e.g., `LogLevel.INFO`)
- **Files**:
  - Commands: PascalCase (e.g., `CreateERC721Command.ts`)
  - Utilities: camelCase with category (e.g., `logger.utils.ts`)
  - Config: camelCase (e.g., `network.config.ts`)

### Command Categories

Current categories:
- `collections` - Collection factory operations
- `nfts` - Minting operations
- `marketplace` - Listing, buying, selling
- `auctions` - Auction creation and bidding
- `bundles` - Bundle management
- `offers` - Offer creation and management
- `analytics` - Statistics and reporting

When adding a new category, update this list.

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# ABI API Configuration (Required)
ABI_API_URL=http://localhost:3000
ABI_API_KEY=your-api-key-here

# ABI Version Control
ABI_VERSION=1.0.0  # Or 'latest' for auto-update

# ABI Cache
ABI_CACHE_ENABLED=true
ABI_CACHE_TTL=300000  # 5 minutes in ms

# ABI Prefetch (Performance optimization)
ABI_PREFETCH_ENABLED=true

# Development
DEBUG=false  # Set to 'true' for debug logs
```

### Network Configuration

Networks are fetched from ABI API but RPC URLs are hardcoded in `src/config/network.config.ts`:

```typescript
// Update RPC URLs here
if (configMap.sepolia) {
  configMap.sepolia.rpcUrl = 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY';
}
```

### Contract Addresses

Contract addresses are **automatically fetched from the ABI API** based on network ID. No manual configuration needed.

## API Integration

### ABI API Client

**File**: `src/providers/abi/abiApiClient.ts`

**Key Methods:**
```typescript
// Fetch single ABI by name
await apiClient.fetchABIByName('ERC721CollectionFactory', '1.0.0');

// Fetch ABI by hash (exact match)
await apiClient.fetchABIByHash('abc123...');

// Fetch multiple ABIs (for prefetch)
await apiClient.fetchMultipleABIs(['Contract1', 'Contract2']);

// Fetch deployed contracts for network
await apiClient.fetchDeployedContracts(networkId);

// Fetch networks
await apiClient.fetchNetworks();
```

### Caching

**File**: `src/providers/abi/abiCacheManager.ts`

ABIs are cached in memory with TTL. Cache key format:
```
{contractName}:{version}:{abiHash}
```

Clear cache: `abiProvider.clearCache()`

### Retry Logic

API calls retry up to 3 times with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: 1s delay
- Attempt 3: 2s delay

Does not retry on NOT_FOUND or validation errors.

## Testing & Debugging

### Running in Development Mode

```bash
# With auto-reload (using tsx)
pnpm run dev

# Or with npm
npm run dev
```

### Debug Mode

Enable debug logging:
```bash
DEBUG=true pnpm start
```

This shows:
- Full error stack traces
- Debug log messages
- API request/response details

### Type Checking

```bash
pnpm run typecheck
```

### Building

```bash
pnpm run build
```

Output goes to `dist/` directory.

### Manual Testing

The CLI is fully interactive. Run `pnpm start` and follow prompts.

For programmatic testing, you can import and use commands directly:
```typescript
import { createProviderContext } from '@providers/ProviderContext';
import { createABIProvider } from '@providers/abi';
import { CreateERC721Command } from '@commands/collections';

const provider = await createProviderContext('local');
const abiProvider = createABIProvider();
const command = new CreateERC721Command();

await command.execute({ provider, abiProvider }, {
  name: 'Test Collection',
  symbol: 'TEST',
  maxSupply: 1000,
});
```

## Common Tasks

### Check Available Commands
```typescript
import { commandRegistry } from '@core/CommandRegistry';

console.log(`Total commands: ${commandRegistry.count()}`);
console.log(`Categories:`, commandRegistry.getCategories());
console.log(`All commands:`, commandRegistry.listByCategory());
```

### Get Contract Interface
```typescript
const iface = await context.abiProvider.getContractInterface('ERC721NFTExchange');
const fragment = iface.getFunction('createListing');
```

### Parse Transaction Logs
```typescript
const receipt = await tx.wait();
for (const log of receipt.logs) {
  try {
    const parsed = contract.interface.parseLog({
      topics: log.topics as string[],
      data: log.data,
    });
    if (parsed?.name === 'CollectionCreated') {
      const address = parsed.args[0];
    }
  } catch {
    // Not our event
  }
}
```

### Get Account Balance
```typescript
const balance = await context.provider.provider.getBalance(
  context.provider.account
);
console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
```

## Troubleshooting

### Common Issues

**1. "No accounts found" Error**
- Ensure local network is running (e.g., `anvil`, `hardhat node`)
- Check RPC URL in `src/config/network.config.ts`

**2. "ABI not found" Error**
- Verify contract is registered in ABI API
- Check contract name spelling
- Ensure ABI_API_URL and ABI_API_KEY are set correctly

**3. "Network not found" Error**
- Check that network exists in ABI API
- Update NETWORK_SLUG_MAP in `src/config/network.config.ts` if needed

**4. Type Errors**
- Run `pnpm run typecheck` to see all errors
- Ensure strict mode compliance
- Check for missing null checks (`noUncheckedIndexedAccess`)

**5. Import Errors**
- Use path aliases, not relative paths
- Check that paths are configured in `tsconfig.json`
- Ensure files are exported from index files

### Debug Workflow

1. Enable DEBUG mode: `DEBUG=true pnpm start`
2. Check error stack traces
3. Verify API connectivity: Test API endpoint directly
4. Check cache: Clear cache if stale data suspected
5. Verify contract deployment: Check contract exists on network

## Git Workflow

### Branch Naming
- Feature: `feature/description`
- Fix: `fix/issue-number-description`
- Refactor: `refactor/description`

### Commit Messages
Follow conventional commits:
```
feat(category): add new feature
fix(category): fix bug
refactor(category): refactor code
docs: update documentation
chore: maintenance tasks
```

Examples from this repo:
```
feat(cli): add account selection prompt and enhance BuyNFTCommand
refactor(commands): replace hardcoded ABIs with minimal ABIs
fix(package): correct test script formatting
```

### Pull Request Process
1. Create feature branch from `main`
2. Implement changes following conventions
3. Test thoroughly (manual for now)
4. Create PR to `main`
5. Merge after review

## Best Practices for AI Assistants

### When Adding Features

1. **Always follow the Command Pattern** - Don't add standalone scripts
2. **Use path aliases** - Never use relative imports
3. **Fetch ABIs from provider** - Don't hardcode ABIs
4. **Get addresses from context** - Don't hardcode addresses
5. **Use logger utility** - Don't use console.log directly
6. **Handle errors properly** - Try/catch in execute, use logError
7. **Add prompts for interactive use** - Implement getPrompts()
8. **Keep types in types/index.ts** - Don't scatter type definitions
9. **Export from index files** - Maintain clean public API
10. **Follow naming conventions** - See conventions section above

### When Refactoring

1. **Preserve pattern integrity** - Don't break Command/Strategy/Registry patterns
2. **Update all references** - Use IDE refactoring tools
3. **Test after changes** - Run typecheck and manual tests
4. **Update documentation** - Keep README and this file in sync

### When Debugging

1. **Enable DEBUG mode** - Get full context
2. **Check type errors first** - Run typecheck
3. **Verify API integration** - Test endpoints manually
4. **Follow the execution flow** - CLI → Command → Provider → Contract

### Code Review Checklist

- [ ] Uses path aliases for imports
- [ ] Follows Command Pattern (if adding command)
- [ ] Proper error handling (try/catch)
- [ ] Uses logger utility (no console.log)
- [ ] Types are defined in types/index.ts
- [ ] No hardcoded ABIs or addresses
- [ ] Exports added to index files
- [ ] Follows naming conventions
- [ ] TypeScript strict mode compliant
- [ ] Prompts implemented for interactive use

## Important Files Reference

**Core Framework:**
- `src/core/Command.interface.ts` - Base command class
- `src/core/CommandRegistry.ts` - Command registry
- `src/types/index.ts` - All type definitions

**CLI:**
- `src/cli/index.ts` - Main CLI application
- `src/cli/prompts.ts` - Interactive prompts
- `src/cli/registerCommands.ts` - Command registration

**Providers:**
- `src/providers/ProviderContext.ts` - Blockchain provider
- `src/providers/abi/APIABIProvider.ts` - ABI provider
- `src/providers/abi/abiApiClient.ts` - API client

**Config:**
- `src/config/network.config.ts` - Network settings
- `src/config/abiApiConfig.ts` - ABI API settings
- `.env.example` - Environment template

**Utils:**
- `src/utils/logger.utils.ts` - Logging
- `src/utils/validation.utils.ts` - Input validation
- `src/utils/nft.utils.ts` - NFT helpers

## Additional Resources

- **README.md** - User-facing documentation
- **package.json** - Dependencies and scripts
- **tsconfig.json** - TypeScript configuration
- **ABI API Docs** - Check `zuno-marketplace-abis` repository

---

**Last Updated**: 2025-11-15 (Auto-generated from repository state)

**Version**: 2.0.0

For questions or clarifications, refer to the codebase or existing command implementations as examples.
