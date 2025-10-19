# Zuno Marketplace Scripts - Professional CLI Toolkit

A professional, production-ready CLI toolkit for testing and interacting with Zuno NFT Marketplace smart contracts. Built with TypeScript, design patterns, and best practices for scalability and maintainability.

## 🚀 Features

- **Interactive CLI** - Beautiful inquirer-based interface
- **Command Pattern** - Easy to add new commands without modifying existing code
- **Strategy Pattern** - Flexible ABI provider (manual now, API-ready for future)
- **Type-Safe** - Full TypeScript support with strict type checking
- **Modular Architecture** - Clean separation of concerns
- **Extensible** - Add new features with minimal code changes
- **Production Ready** - Enterprise-grade code quality

## 📦 Installation

```bash
# Install dependencies
pnpm install

# Build the project
pnpm run build

# Start the CLI
pnpm start
```

## 🎯 Quick Start

### Interactive Mode

```bash
pnpm start
```

This launches the interactive CLI where you can:
1. Select network (local/sepolia/mainnet)
2. Choose category (collections, nfts, marketplace, etc.)
3. Select command
4. Fill in parameters via prompts
5. Execute and see results

### Available Commands

#### Collections
- **create-erc721** - Create a new ERC721 NFT collection
- **create-erc1155** - Create a new ERC1155 NFT collection

#### NFTs
- **mint-erc721** - Mint ERC721 NFTs (supports batch minting)
- **mint-erc1155** - Mint ERC1155 tokens (supports batch minting)

#### Marketplace
- **list-nft** - List NFT for sale on marketplace (ERC721 & ERC1155)
- **buy-nft** - Buy NFT from marketplace

#### Auctions
- **create-auction** - Create English or Dutch auction for NFT
- **place-bid** - Place bid on English auction or buy from Dutch auction

#### Bundles
- **create-bundle** - Create a bundle of multiple NFTs for sale

#### Offers
- **create-offer** - Create an offer for an NFT

#### Analytics
- **collection-stats** - View statistics for an NFT collection

## 🏗️ Architecture

### Project Structure

```
src/
├── cli/                    # CLI entry point and prompts
│   ├── index.ts           # Main CLI application
│   ├── prompts.ts         # Inquirer prompts
│   └── registerCommands.ts # Command registration
├── commands/              # Command implementations
│   ├── collections/       # Collection commands
│   ├── nfts/             # NFT commands
│   └── index.ts          # Command exports
├── core/                 # Core framework
│   ├── Command.interface.ts # Base command interface
│   └── CommandRegistry.ts   # Command registry
├── providers/            # Provider implementations
│   ├── abi/             # ABI providers (Strategy Pattern)
│   │   ├── ABIProvider.interface.ts
│   │   ├── ManualABIProvider.ts  # Current: file-based
│   │   ├── APIABIProvider.ts     # Future: API-based
│   │   └── index.ts
│   └── ProviderContext.ts # Blockchain provider context
├── config/              # Configuration
│   └── network.config.ts # Network settings
├── types/               # TypeScript types
│   └── index.ts
├── utils/               # Utility functions
│   ├── nft.utils.ts
│   ├── validation.utils.ts
│   └── logger.utils.ts
└── index.ts             # Main exports
```

### Design Patterns

#### 1. Command Pattern
Each script is encapsulated as a command class:

```typescript
export class CreateERC721Command extends BaseCommand {
  metadata = {
    name: 'create-erc721',
    description: 'Create a new ERC721 NFT Collection',
    category: 'collections',
  };

  async execute(context: CommandContext, args?: any): Promise<void> {
    // Implementation
  }
}
```

**Benefits:**
- Add new commands without modifying existing code
- Consistent command interface
- Easy to test and maintain

#### 2. Strategy Pattern (ABI Provider)
Flexible ABI sourcing that can switch between file-based and API-based:

```typescript
// Current: Manual file-based
const abiProvider = createABIProvider('manual');

// Future: API-based (when zuno-marketplace-abis is ready)
const abiProvider = createABIProvider('api', {
  apiUrl: 'https://api.zuno.com/abis'
});
```

**Benefits:**
- Easy migration from manual to API
- No code changes required in commands
- Centralized ABI management

#### 3. Registry Pattern
Central command registry for discovery and execution:

```typescript
commandRegistry.register(new CreateERC721Command());
const command = commandRegistry.get('create-erc721');
await command.execute(context);
```

## 🔧 Adding New Commands

Adding a new command is simple and follows the Open/Closed Principle:

### Step 1: Create Command Class

```typescript
// src/commands/marketplace/ListNFTCommand.ts
import { BaseCommand } from '../../core/Command.interface';

export class ListNFTCommand extends BaseCommand {
  metadata = {
    name: 'list-nft',
    description: 'List NFT for sale',
    category: 'marketplace',
  };

  async execute(context: CommandContext, args?: any): Promise<void> {
    this.logStart();

    // Your implementation here

    this.logSuccess('NFT listed successfully!');
  }

  async getPrompts(): Promise<any[]> {
    return [
      {
        type: 'input',
        name: 'nftAddress',
        message: 'NFT contract address:',
      },
      // More prompts...
    ];
  }
}
```

### Step 2: Register Command

```typescript
// src/cli/registerCommands.ts
import { ListNFTCommand } from '../commands/marketplace';

export function registerAllCommands(): void {
  // ... existing commands
  commandRegistry.register(new ListNFTCommand());
}
```

That's it! No changes to existing code needed.

## 🔄 Migration from Old Scripts

✅ **Migration Complete!** The new CLI now includes all features from the old scripts:

**Implemented (11/13 commands):**
- ✅ Collections: create-erc721, create-erc1155
- ✅ NFTs: mint-erc721, mint-erc1155 (with batch support)
- ✅ Marketplace: list-nft, buy-nft
- ✅ Auctions: create-auction, place-bid
- ✅ Bundles: create-bundle
- ✅ Offers: create-offer
- ✅ Analytics: collection-stats

**Note:** The old `batch-mint-erc721` and `batch-mint-erc1155` scripts are now integrated into the `mint-erc721` and `mint-erc1155` commands respectively (use `quantity` parameter for batch minting).

You can now safely delete the old `scripts/` directory:

```bash
rm -rf scripts/
```

See [MIGRATION.md](./MIGRATION.md) for detailed migration guide.

## 🌐 Network Configuration

Configure networks in `.env` file:

```env
# Local Network
NEXT_PUBLIC_RPC_URL_LOCAL=http://127.0.0.1:8545
NEXT_PUBLIC_USER_HUB_LOCAL=0x...

# Sepolia Testnet
NEXT_PUBLIC_RPC_URL_SEPOLIA=https://sepolia.infura.io/v3/YOUR_KEY
NEXT_PUBLIC_USER_HUB_SEPOLIA=0x...

# Mainnet
NEXT_PUBLIC_RPC_URL_MAINNET=https://mainnet.infura.io/v3/YOUR_KEY
NEXT_PUBLIC_USER_HUB_MAINNET=0x...
```

## 🚀 Future Enhancements

### ABI Provider Migration
When `zuno-marketplace-abis` API is ready:

```typescript
// Simply change the provider type in CLI initialization
const abiProvider = createABIProvider('api', {
  apiUrl: process.env.ABI_API_URL
});
```

No other code changes required!

### Potential Additional Commands
The architecture supports easy addition of:
- Marketplace: cancel-listing, update-price
- Auctions: cancel-auction, settle-auction
- Offers: accept-offer, cancel-offer
- Bundles: buy-bundle, cancel-bundle
- Analytics: listing-history, trade-volume, floor-price

## 📝 Development

```bash
# Start in development mode (with auto-reload)
pnpm run dev

# Build TypeScript
pnpm run build

# Clean build artifacts
pnpm run clean

# Run CLI
pnpm run cli
```

## 🎨 Code Quality

- **TypeScript** - Full type safety with strict mode
- **ESM Support** - Modern module system
- **Clean Architecture** - SOLID principles
- **Design Patterns** - Command, Strategy, Registry
- **Error Handling** - Comprehensive error management
- **Logging** - Consistent, beautiful logging

## 📚 Examples

### Programmatic Usage

```typescript
import { createProviderContext } from './providers/ProviderContext';
import { createABIProvider } from './providers/abi';
import { CreateERC721Command } from './commands/collections';

const provider = await createProviderContext('local');
const abiProvider = createABIProvider('manual');

const command = new CreateERC721Command();
await command.execute({ provider, abiProvider }, {
  name: 'My Collection',
  symbol: 'MYCOL',
  maxSupply: 10000,
});
```

## 🤝 Contributing

1. Create new command in appropriate category folder
2. Implement `BaseCommand` interface
3. Register in `registerCommands.ts`
4. Add tests (coming soon)
5. Update documentation

## 📄 License

ISC

## 🙏 Credits

Built with ❤️ for the Zuno NFT Marketplace ecosystem.
