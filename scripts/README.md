# NFT Marketplace Test Scripts

This directory contains test scripts for creating collections and minting NFTs on the Zuno Marketplace.

## Setup

1. Ensure your root `.env` file has the required configuration:

```bash
# Check if .env exists in root
cat ../.env

# Or copy from example if needed
cp ../.env.example ../.env
```

2. The scripts use the same environment variables as the main application:

- `NEXT_PUBLIC_MARKETPLACE_HUB_LOCAL` - Hub address for local network
- `NEXT_PUBLIC_RPC_URL_LOCAL` - RPC URL for local network
- Similar variables for Sepolia and Mainnet

3. Make sure dependencies are installed:

```bash
# In root directory
npm install
# or
pnpm install
```

## Directory Structure

```
scripts/
├── collections/         # Collection creation scripts
│   ├── create-erc721.js
│   └── create-erc1155.js
├── nfts/               # NFT minting scripts
│   ├── mint-erc721.js
│   ├── mint-erc1155.js
│   ├── batch-mint-erc721.js
│   └── batch-mint-erc1155.js
├── marketplace/        # NFT marketplace trading
│   ├── list-nft.js     # List NFTs for sale
│   └── buy-nft.js      # Purchase listed NFTs
├── auctions/          # Auction management
│   ├── create-auction.js # Create English/Dutch auctions
│   └── place-bid.js    # Bid on auctions
├── offers/            # Offer system
│   └── create-offer.js # Create NFT/collection/trait offers
├── bundles/           # Bundle trading
│   └── create-bundle.js # Bundle multiple NFTs
├── analytics/         # Analytics and stats
│   └── collection-stats.js # Get collection analytics
├── utils/              # Shared utilities
│   └── config.js
├── extract-abis.js     # Extract ABIs from contracts
├── start-mint.ts       # Start minting for collections
├── manage-allowlist.ts # Manage collection allowlists
└── test-all.js         # Run all tests
```

## Usage

### Extract ABIs from Contracts

Extract contract ABIs from the compiled Foundry artifacts:

```bash
# Extract with default paths
node scripts/extract-abis.js

# Specify custom contracts directory
node scripts/extract-abis.js --contracts-dir /path/to/contracts/out

# Specify custom output directory
node scripts/extract-abis.js --output-dir /path/to/output

# Use both custom paths
node scripts/extract-abis.js --contracts-dir /path/to/contracts/out --output-dir /path/to/output

# Show help
node scripts/extract-abis.js --help
```

**Default paths:**

- Contracts directory: `../zuno-marketplace-contracts/out`
- Output directory: `./src/lib/contracts/abis`

**Features:**

- Automatically creates output directory if it doesn't exist
- Validates contracts directory exists before extraction
- Generates TypeScript index file with all ABI exports
- Extracts 23+ contract ABIs in one command

### Manage Mint Stages

Update mint stage for a collection (requires collection owner):

```bash
# Progress to next stage (not_started -> allowlist -> public)
npx tsx scripts/start-mint.ts 0xCollectionAddress

# Skip directly to public mint (stage 2)
npx tsx scripts/start-mint.ts 0xCollectionAddress 2

# Skip to allowlist stage (stage 1)
npx tsx scripts/start-mint.ts 0xCollectionAddress 1
```

**Mint Stages:**

- `0`: Not Started - No minting allowed
- `1`: Allowlist - Only allowlisted addresses can mint
- `2`: Public - Anyone can mint

### Manage Allowlist

Add or remove addresses from collection allowlist:

```bash
# Add single address to allowlist
npx tsx scripts/manage-allowlist.ts 0xCollectionAddress add 0xUserAddress

# Add multiple addresses
npx tsx scripts/manage-allowlist.ts 0xCollectionAddress add 0xAddr1 0xAddr2 0xAddr3

# Remove address from allowlist
npx tsx scripts/manage-allowlist.ts 0xCollectionAddress remove 0xUserAddress

# Check if address is in allowlist
npx tsx scripts/manage-allowlist.ts 0xCollectionAddress check 0xUserAddress
```

### Create Collections

#### ERC721 Collection

```bash
node scripts/collections/create-erc721.js
```

#### ERC1155 Collection

```bash
node scripts/collections/create-erc1155.js
```

### Mint NFTs

#### Single ERC721 NFT

```bash
# Mint 1 NFT
node scripts/nfts/mint-erc721.js 0xCollectionAddress

# Mint 5 NFTs
node scripts/nfts/mint-erc721.js 0xCollectionAddress 5

# Mint to specific address
node scripts/nfts/mint-erc721.js 0xCollectionAddress 1 0xRecipientAddress
```

#### Single ERC1155 Token

```bash
# Mint 100 units of token ID 1
node scripts/nfts/mint-erc1155.js 0xCollectionAddress 1 100

# Mint to specific address
node scripts/nfts/mint-erc1155.js 0xCollectionAddress 1 100 0xRecipientAddress
```

### Batch Mint NFTs

#### Batch ERC721 NFTs

```bash
# Mint 20 NFTs
node scripts/nfts/batch-mint-erc721.js 0xCollectionAddress 20

# Mint to multiple recipients
node scripts/nfts/batch-mint-erc721.js 0xCollectionAddress 10 0xAddress1 0xAddress2
```

#### Batch ERC1155 Tokens

```bash
# Mint multiple token IDs with different amounts
node scripts/nfts/batch-mint-erc1155.js 0xCollectionAddress 1,2,3 100,200,300

# This mints:
# - 100 units of token ID 1
# - 200 units of token ID 2
# - 300 units of token ID 3
```

### Marketplace Trading

#### List NFT for Sale

```bash
# Interactive mode
node scripts/marketplace/list-nft.js

# With parameters
node scripts/marketplace/list-nft.js 0xNFTAddress tokenId priceInETH durationInDays

# Example: List token #5 for 0.1 ETH for 7 days
node scripts/marketplace/list-nft.js 0x123... 5 0.1 7
```

#### Buy Listed NFT

```bash
# Buy by listing ID
node scripts/marketplace/buy-nft.js 0xListingId

# Buy by NFT address and token ID
node scripts/marketplace/buy-nft.js 0xNFTAddress tokenId
```

### Auction System

#### Create Auction

```bash
# Interactive mode (choose English or Dutch)
node scripts/auctions/create-auction.js

# With NFT address and token ID
node scripts/auctions/create-auction.js 0xNFTAddress tokenId
```

#### Place Bid / Buy from Auction

```bash
# English auction - place bid
# Dutch auction - buy at current price
node scripts/auctions/place-bid.js 0xAuctionId
```

### Offer System

#### Create Offer

```bash
# Interactive mode (choose offer type)
node scripts/offers/create-offer.js

# Supports:
# - NFT Offer: Offer on specific token
# - Collection Offer: Offer on any token in collection  
# - Trait Offer: Offer on tokens with specific traits
```

### Bundle Trading

#### Create Bundle

```bash
# Bundle multiple NFTs together
node scripts/bundles/create-bundle.js

# Bundles 2-20 NFTs with single price
# Supports both ERC721 and ERC1155
```

### Analytics

#### Get Collection Statistics

```bash
# View collection analytics
node scripts/analytics/collection-stats.js 0xCollectionAddress

# Shows:
# - Trading volume and sales
# - Floor price and average price
# - 24h activity and volume change
# - Recent sales history
# - Active listings
```

### Run All Tests

```bash
# Test everything: create collections and mint NFTs
node scripts/test-all.js
```

## Environment Variables

The scripts use the same environment variables as the main application from the root `.env` file:

```env
# Local Network (required for local testing)
NEXT_PUBLIC_RPC_URL_LOCAL=http://127.0.0.1:8545
NEXT_PUBLIC_MARKETPLACE_HUB_LOCAL=0x68B1D87F95878fE05B998F19b66F4baba5De1aed

# Sepolia Testnet (optional)
NEXT_PUBLIC_RPC_URL_SEPOLIA=https://sepolia.infura.io/v3/YOUR_KEY
NEXT_PUBLIC_MARKETPLACE_HUB_SEPOLIA=

# Mainnet (optional)
NEXT_PUBLIC_RPC_URL_MAINNET=https://mainnet.infura.io/v3/YOUR_KEY
NEXT_PUBLIC_MARKETPLACE_HUB_MAINNET=
```

## Features

### Smart Contract Detection

The scripts automatically detect and use the correct mint functions:

- For ERC721: `mint`, `publicMint`, `safeMint`, `mintBatch`, etc.
- For ERC1155: `mint`, `publicMint`, `mintBatch`, etc.

### Error Handling

- Validates addresses and parameters
- Checks mint prices and balances
- Verifies collection metadata
- Handles missing functions gracefully

### Batch Operations

- Batch minting with automatic fallback to sequential minting
- Multiple recipient support
- Supply limit detection and adjustment

### Network Support

- Local network (Anvil/Hardhat)
- Sepolia testnet
- Ethereum mainnet

## Troubleshooting

### "Hub address not configured"

Make sure to set the hub address in your `.env` file for the network you're using.

### "No compatible mint function found"

The collection contract might have different mint function names or requirements. Check the contract's ABI.

### "Collection name or symbol is empty"

This is a known issue with some smart contract implementations. The collection is created but metadata might not be stored correctly.

### Transaction Reverts

- Check you have enough ETH for gas and mint fees
- Verify the collection hasn't reached max supply
- Ensure you're using the correct network

## Development

To add new scripts or modify existing ones:

1. Use the utilities in `utils/config.js` for common operations
2. Follow the existing patterns for error handling
3. Add appropriate console logging for user feedback
4. Test on local network first before testnet/mainnet

## Security

⚠️ **NEVER commit your `.env` file with private keys or API keys!**

The root `.env` file is gitignored by default. Keep your private keys secure.
