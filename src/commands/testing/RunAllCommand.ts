/**
 * Run All Commands
 * Executes all CLI commands in sequence using real contract data
 * This command tests the entire workflow: create collections, mint NFTs, list on marketplace, etc.
 */

import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { commandRegistry } from '@core/CommandRegistry';
import { logger } from '@utils';

interface CommandResult {
  name: string;
  category: string;
  success: boolean;
  error?: string;
  duration: number;
  output?: any;
}

interface WorkflowState {
  erc721Collection?: string;
  erc1155Collection?: string;
  erc721TokenIds?: string[];
  erc1155TokenIds?: string[];
  erc721BatchTokenIds?: string[];
  erc1155BatchTokenIds?: number[];
  listingIds?: string[];
  auctionIds?: string[];
  bundleIds?: string[];
  offerIds?: string[];
  englishAuctionId?: string;
  dutchAuctionId?: string;
}

export class RunAllCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'run-all',
    description: 'Execute all CLI commands with real contract data',
    category: 'testing',
    aliases: ['test-all', 'run-all-commands'],
  };

  private state: WorkflowState = {};

  async execute(context: CommandContext, _args?: any): Promise<void> {
    this.logStart();

    try {
      logger.section('🚀 Running Complete Workflow Test');
      logger.info('This will execute all commands in sequence using real contract data');
      logger.space();

      const results: CommandResult[] = [];

      // Phase 1: Collections
      logger.section('📦 PHASE 1: CREATE COLLECTIONS');
      results.push(await this.runCreateERC721(context));
      results.push(await this.runCreateERC1155(context));
      logger.space();

      // Phase 2: Minting
      logger.section('🎨 PHASE 2: MINT NFTS');
      if (this.state.erc721Collection) {
        results.push(await this.runMintERC721(context, 'single', 3));
        results.push(await this.runMintERC721(context, 'batch', 5));
      } else {
        logger.warning('Skipping ERC721 minting - no collection created');
      }

      if (this.state.erc1155Collection) {
        results.push(await this.runMintERC1155(context, 'single', 1, 100));
        results.push(await this.runMintERC1155(context, 'batch-multi-ids', [2, 3, 4], [50, 75, 100]));
      } else {
        logger.warning('Skipping ERC1155 minting - no collection created');
      }
      logger.space();

      // Phase 3: Marketplace Operations
      logger.section('🏪 PHASE 3: MARKETPLACE OPERATIONS');
      if (this.state.erc721Collection && this.state.erc721TokenIds && this.state.erc721TokenIds.length > 0) {
        results.push(await this.runListNFT(context, 'ERC721'));
        // Test cancel listing
        if (this.state.listingIds && this.state.listingIds.length > 0) {
          results.push(await this.runCancelListing(context));
        }
        // List another for buy test
        results.push(await this.runListNFT(context, 'ERC721', 1));
      } else {
        logger.warning('Skipping ERC721 listing - no tokens available');
      }

      if (this.state.erc1155Collection && this.state.erc1155TokenIds && this.state.erc1155TokenIds.length > 0) {
        results.push(await this.runListNFT(context, 'ERC1155', 0, 1)); // List only 1 unit (ERC1155 mint creates 1 unit per token ID)
      } else {
        logger.warning('Skipping ERC1155 listing - no tokens available');
      }

      // View and search listings
      results.push(await this.runViewListings(context));
      results.push(await this.runSearchMarketplace(context));

      // Test buy NFT (will attempt but fail gracefully if buyer==seller)
      results.push(await this.runBuyNFT(context));

      logger.space();

      // Phase 4: Bundle Operations (MOVED UP - before auctions to avoid escrow conflicts)
      logger.section('📦 PHASE 4: BUNDLE OPERATIONS');
      if (this.state.erc721BatchTokenIds && this.state.erc721BatchTokenIds.length >= 3) {
        results.push(await this.runCreateBundle(context));
        // Note: List Bundle and Buy Bundle require bundle marketplace integration
      } else {
        logger.warning('Skipping bundle operations - insufficient tokens');
      }
      logger.space();

      // Phase 5: Auction Operations (MOVED DOWN - after bundle)
      logger.section('🔨 PHASE 5: AUCTION OPERATIONS');
      if (this.state.erc721BatchTokenIds && this.state.erc721BatchTokenIds.length > 2) {
        // Test English Auction
        results.push(await this.runCreateAuction(context, 'english'));
        // Test Dutch Auction
        results.push(await this.runCreateAuction(context, 'dutch'));
        // Test Place Bid (if auction created)
        if (this.state.englishAuctionId) {
          results.push(await this.runPlaceBid(context));
        }
      } else {
        logger.warning('Skipping auction operations - insufficient batch tokens');
      }
      logger.space();

      // Phase 6: Offer Operations
      logger.section('💰 PHASE 6: OFFER OPERATIONS');
      if (this.state.erc721Collection && this.state.erc721TokenIds && this.state.erc721TokenIds.length > 2) {
        results.push(await this.runCreateOffer(context));
      } else {
        logger.warning('Skipping offer creation - no collection available');
      }
      logger.space();

      // Phase 7: NFT Operations (Transfer, Approve, Burn)
      logger.section('🔄 PHASE 7: NFT OPERATIONS');
      if (this.state.erc721BatchTokenIds && this.state.erc721BatchTokenIds.length >= 4) {
        // We have extra tokens from batch minting to test with
        results.push(await this.runTransferNFT(context));
        // Burn NFT - destructive operation, use last token
        if (this.state.erc721BatchTokenIds.length >= 5) {
          results.push(await this.runBurnNFT(context));
        }
      } else {
        logger.warning('Skipping NFT operations - insufficient tokens');
      }
      logger.space();

      // Phase 8: Analytics
      logger.section('📊 PHASE 8: ANALYTICS');
      if (this.state.erc721Collection) {
        results.push(await this.runCollectionStats(context));
      } else {
        logger.warning('Skipping analytics - no collection available');
      }
      logger.space();

      // Display Summary
      this.displaySummary(results);

    } catch (error) {
      logger.error(`Run-all command failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Create ERC721 Collection
   */
  private async runCreateERC721(context: CommandContext): Promise<CommandResult> {
    const commandName = 'create-erc721';
    const startTime = Date.now();

    logger.subsection('Creating ERC721 Collection');

    try {
      const command = commandRegistry.get(commandName);
      if (!command) {
        throw new Error(`Command not found: ${commandName}`);
      }

      const args = {
        name: 'Test ERC721 Collection',
        symbol: 'TEST721',
        description: 'Auto-generated test collection',
        mintPrice: '0.01',
        royaltyFee: 500,
        maxSupply: 10000,
        mintLimitPerWallet: 100,
      };

      // Capture collection address from logs
      const originalInfo = logger.info.bind(logger);
      let collectionAddress: string | undefined;

      logger.info = (message: string) => {
        originalInfo(message);
        const match = message.match(/Collection Address: (0x[a-fA-F0-9]{40})/);
        if (match) {
          collectionAddress = match[1];
        }
      };

      await command.execute(context, args);

      logger.info = originalInfo;

      if (collectionAddress) {
        this.state.erc721Collection = collectionAddress;
        logger.success(`✅ ERC721 Collection created: ${collectionAddress}`);
      }

      const duration = Date.now() - startTime;
      return { name: commandName, category: 'collections', success: true, duration, output: collectionAddress };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Failed: ${(error as Error).message}`);
      return { name: commandName, category: 'collections', success: false, error: (error as Error).message, duration };
    }
  }

  /**
   * Create ERC1155 Collection
   */
  private async runCreateERC1155(context: CommandContext): Promise<CommandResult> {
    const commandName = 'create-erc1155';
    const startTime = Date.now();

    logger.subsection('Creating ERC1155 Collection');

    try {
      const command = commandRegistry.get(commandName);
      if (!command) {
        throw new Error(`Command not found: ${commandName}`);
      }

      const args = {
        name: 'Test ERC1155 Collection',
        symbol: 'TEST1155',
        description: 'Auto-generated test collection',
        mintPrice: '0.005',
        royaltyFee: 300,
        maxSupply: 50000,
        mintLimitPerWallet: 500,
      };

      const originalInfo = logger.info.bind(logger);
      let collectionAddress: string | undefined;

      logger.info = (message: string) => {
        originalInfo(message);
        const match = message.match(/Collection Address: (0x[a-fA-F0-9]{40})/);
        if (match) {
          collectionAddress = match[1];
        }
      };

      await command.execute(context, args);

      logger.info = originalInfo;

      if (collectionAddress) {
        this.state.erc1155Collection = collectionAddress;
        logger.success(`✅ ERC1155 Collection created: ${collectionAddress}`);
      }

      const duration = Date.now() - startTime;
      return { name: commandName, category: 'collections', success: true, duration, output: collectionAddress };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Failed: ${(error as Error).message}`);
      return { name: commandName, category: 'collections', success: false, error: (error as Error).message, duration };
    }
  }

  /**
   * Mint ERC721 NFTs
   */
  private async runMintERC721(
    context: CommandContext,
    mode: 'single' | 'batch' = 'single',
    quantity: number = 3
  ): Promise<CommandResult> {
    const commandName = 'mint-erc721';
    const startTime = Date.now();

    logger.subsection(`Minting ERC721 NFTs (${mode} mode, qty: ${quantity})`);

    try {
      const command = commandRegistry.get(commandName);
      if (!command) {
        throw new Error(`Command not found: ${commandName}`);
      }

      const args = {
        collectionAddress: this.state.erc721Collection!,
        quantity,
      };

      const originalInfo = logger.info.bind(logger);
      const tokenIds: string[] = [];

      logger.info = (message: string) => {
        originalInfo(message);
        const match = message.match(/Token #(\d+)/);
        if (match && match[1]) {
          tokenIds.push(match[1]);
        }
      };

      await command.execute(context, args);

      logger.info = originalInfo;

      if (tokenIds.length > 0) {
        if (mode === 'single') {
          this.state.erc721TokenIds = tokenIds;
        } else {
          this.state.erc721BatchTokenIds = tokenIds;
        }
        logger.success(`✅ Minted ${tokenIds.length} ERC721 tokens (${mode}): ${tokenIds.join(', ')}`);
      }

      const duration = Date.now() - startTime;
      return {
        name: `${commandName}-${mode}`,
        category: 'nfts',
        success: true,
        duration,
        output: tokenIds
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Failed: ${(error as Error).message}`);
      return {
        name: `${commandName}-${mode}`,
        category: 'nfts',
        success: false,
        error: (error as Error).message,
        duration
      };
    }
  }

  /**
   * Mint ERC1155 NFTs
   */
  private async runMintERC1155(
    context: CommandContext,
    mode: 'single' | 'batch-multi-ids' = 'single',
    tokenIds: number | number[] = 1,
    amounts: number | number[] = 100
  ): Promise<CommandResult> {
    const commandName = 'mint-erc1155';
    const startTime = Date.now();

    const modeLabel = mode === 'batch-multi-ids' ? 'batch (multiple IDs)' : 'single ID';
    logger.subsection(`Minting ERC1155 NFTs (${modeLabel})`);

    try {
      const command = commandRegistry.get(commandName);
      if (!command) {
        throw new Error(`Command not found: ${commandName}`);
      }

      if (mode === 'single') {
        const args = {
          collectionAddress: this.state.erc1155Collection!,
          tokenId: tokenIds as number,
          amount: amounts as number,
        };

        await command.execute(context, args);
        this.state.erc1155TokenIds = [String(tokenIds)];
        logger.success(`✅ Minted ERC1155 token ID ${tokenIds} with amount ${amounts}`);
      } else {
        // Batch mint multiple token IDs
        const tokenIdArray = Array.isArray(tokenIds) ? tokenIds : [tokenIds];
        const amountArray = Array.isArray(amounts) ? amounts : [amounts];

        for (let i = 0; i < tokenIdArray.length; i++) {
          const args = {
            collectionAddress: this.state.erc1155Collection!,
            tokenId: tokenIdArray[i],
            amount: amountArray[i] || 100,
          };

          logger.info(`Minting token ID ${tokenIdArray[i]} with amount ${amountArray[i] || 100}...`);
          await command.execute(context, args);
        }

        this.state.erc1155BatchTokenIds = tokenIdArray;
        this.state.erc1155TokenIds = [...(this.state.erc1155TokenIds || []), ...tokenIdArray.map(String)];
        logger.success(`✅ Minted ${tokenIdArray.length} different ERC1155 token IDs: ${tokenIdArray.join(', ')}`);
      }

      const duration = Date.now() - startTime;
      return {
        name: `${commandName}-${mode}`,
        category: 'nfts',
        success: true,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Failed: ${(error as Error).message}`);
      return {
        name: `${commandName}-${mode}`,
        category: 'nfts',
        success: false,
        error: (error as Error).message,
        duration
      };
    }
  }

  /**
   * List NFT on Marketplace
   */
  private async runListNFT(
    context: CommandContext,
    standard: 'ERC721' | 'ERC1155',
    tokenIndex: number = 0,
    amount?: number
  ): Promise<CommandResult> {
    const commandName = 'list-nft';
    const startTime = Date.now();

    logger.subsection(`Listing ${standard} NFT on Marketplace (token index: ${tokenIndex})`);

    try {
      const command = commandRegistry.get(commandName);
      if (!command) {
        throw new Error(`Command not found: ${commandName}`);
      }

      const args = standard === 'ERC721' ? {
        nftAddress: this.state.erc721Collection!,
        tokenId: this.state.erc721TokenIds![tokenIndex],
        price: '0.1',
        duration: 7,
      } : {
        nftAddress: this.state.erc1155Collection!,
        tokenId: this.state.erc1155TokenIds![tokenIndex],
        price: '0.05',
        duration: 7,
        amount: amount || 1, // Use provided amount or default to 1 (ERC1155 mint creates 1 unit per token ID)
      };

      const originalInfo = logger.info.bind(logger);
      let listingId: string | undefined;

      logger.info = (message: string) => {
        originalInfo(message);
        const match = message.match(/Listing ID: (0x[a-fA-F0-9]+)/);
        if (match) {
          listingId = match[1];
        }
      };

      await command.execute(context, args);

      logger.info = originalInfo;

      if (listingId) {
        if (!this.state.listingIds) this.state.listingIds = [];
        this.state.listingIds.push(listingId);
        logger.success(`✅ Listed ${standard} NFT: ${listingId}`);
      }

      const duration = Date.now() - startTime;
      return { name: `${commandName}-${standard}-${tokenIndex}`, category: 'marketplace', success: true, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Failed: ${(error as Error).message}`);
      return { name: `${commandName}-${standard}-${tokenIndex}`, category: 'marketplace', success: false, error: (error as Error).message, duration };
    }
  }

  /**
   * Cancel Listing
   */
  private async runCancelListing(context: CommandContext): Promise<CommandResult> {
    const commandName = 'cancel-listing';
    const startTime = Date.now();

    logger.subsection('Canceling Marketplace Listing');

    try {
      const command = commandRegistry.get(commandName);
      if (!command) {
        throw new Error(`Command not found: ${commandName}`);
      }

      if (!this.state.listingIds || this.state.listingIds.length === 0) {
        throw new Error('No listings to cancel');
      }

      const args = {
        listingId: this.state.listingIds[0], // Cancel first listing
      };

      await command.execute(context, args);

      logger.success(`✅ Canceled listing: ${this.state.listingIds[0]}`);

      const duration = Date.now() - startTime;
      return { name: commandName, category: 'marketplace', success: true, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Failed: ${(error as Error).message}`);
      return { name: commandName, category: 'marketplace', success: false, error: (error as Error).message, duration };
    }
  }

  /**
   * Buy NFT from Marketplace
   * Auto-switches to a different account to test buy functionality
   */
  private async runBuyNFT(context: CommandContext): Promise<CommandResult> {
    const commandName = 'buy-nft';
    const startTime = Date.now();

    logger.subsection('Buying NFT from Marketplace');

    try {
      const command = commandRegistry.get(commandName);
      if (!command) {
        throw new Error(`Command not found: ${commandName}`);
      }

      if (!this.state.listingIds || this.state.listingIds.length < 2) {
        throw new Error('Need at least 2 listings (1 was canceled, need another to buy)');
      }

      const { provider } = context;

      // Try to switch to a different account (Hardhat account #1)
      const originalSigner = provider.signer;
      const originalAccount = provider.account;

      try {
        // Get Hardhat's second account (index 1)
        const accounts = await provider.provider.listAccounts();

        if (accounts.length > 1) {
          // Switch to account #1 for buying
          // accounts[1] returns an AddressLike object in ethers v6, need to get the address property
          const buyerAddressObj = accounts[1];
          const buyerAddress = typeof buyerAddressObj === 'string'
            ? buyerAddressObj
            : (buyerAddressObj as any).address || String(buyerAddressObj);
          logger.info(`🔄 Switching to buyer account: ${buyerAddress}`);

          const buyerSigner = await provider.provider.getSigner(buyerAddress);

          // Temporarily update context
          provider.signer = buyerSigner as any;
          provider.account = buyerAddress;

          // Use the second listing (first one was canceled)
          const args = {
            listingId: this.state.listingIds[1],
          };

          await command.execute(context, args);

          logger.success(`✅ Bought NFT from listing: ${this.state.listingIds[1]}`);
          logger.info(`🔄 Switching back to original account: ${originalAccount}`);

          // Restore original signer
          provider.signer = originalSigner;
          provider.account = originalAccount;

          const duration = Date.now() - startTime;
          return { name: commandName, category: 'marketplace', success: true, duration };
        } else {
          logger.warning('Only one account available - cannot test buy (would fail with same buyer/seller)');

          const duration = Date.now() - startTime;
          return {
            name: commandName,
            category: 'marketplace',
            success: false,
            error: 'Single account limitation - buy test skipped',
            duration
          };
        }
      } catch (innerError) {
        // Restore original signer on error
        provider.signer = originalSigner;
        provider.account = originalAccount;
        throw innerError;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = (error as Error).message;

      if (errorMsg.includes('seller') || errorMsg.includes('buyer')) {
        logger.warning('⚠️  Expected failure: Cannot buy your own listing');
      } else {
        logger.error(`❌ Failed: ${errorMsg}`);
      }

      return { name: commandName, category: 'marketplace', success: false, error: errorMsg, duration };
    }
  }

  /**
   * View Marketplace Listings
   */
  private async runViewListings(context: CommandContext): Promise<CommandResult> {
    const commandName = 'view-listings';
    const startTime = Date.now();

    logger.subsection('Viewing Marketplace Listings');

    try {
      const command = commandRegistry.get(commandName);
      if (!command) {
        throw new Error(`Command not found: ${commandName}`);
      }

      await command.execute(context, {});

      const duration = Date.now() - startTime;
      logger.success(`✅ Viewed listings`);
      return { name: commandName, category: 'marketplace', success: true, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Failed: ${(error as Error).message}`);
      return { name: commandName, category: 'marketplace', success: false, error: (error as Error).message, duration };
    }
  }

  /**
   * Search Marketplace
   */
  private async runSearchMarketplace(context: CommandContext): Promise<CommandResult> {
    const commandName = 'search-marketplace';
    const startTime = Date.now();

    logger.subsection('Searching Marketplace');

    try {
      const command = commandRegistry.get(commandName);
      if (!command) {
        throw new Error(`Command not found: ${commandName}`);
      }

      await command.execute(context, { query: 'Test' });

      const duration = Date.now() - startTime;
      logger.success(`✅ Searched marketplace`);
      return { name: commandName, category: 'marketplace', success: true, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Failed: ${(error as Error).message}`);
      return { name: commandName, category: 'marketplace', success: false, error: (error as Error).message, duration };
    }
  }

  /**
   * Create Auction
   */
  private async runCreateAuction(
    context: CommandContext,
    auctionType: 'english' | 'dutch' = 'english'
  ): Promise<CommandResult> {
    const commandName = 'create-auction';
    const startTime = Date.now();

    logger.subsection(`Creating ${auctionType.toUpperCase()} Auction`);

    try {
      const command = commandRegistry.get(commandName);
      if (!command) {
        throw new Error(`Command not found: ${commandName}`);
      }

      if (!this.state.erc721BatchTokenIds || this.state.erc721BatchTokenIds.length < 5) {
        throw new Error('Insufficient batch tokens for auction');
      }

      // Bundle uses tokens 0,1,2 (indices 0,1,2) = tokens #4,#5,#6
      // Auctions should use tokens 3,4 (indices 3,4) = tokens #7,#8
      // But #7,#8 will be transferred/burned later, so that's ok - auctions escrow them first
      const tokenIndex = auctionType === 'english' ? 3 : 4;
      const args = auctionType === 'english' ? {
        auctionType: 'english' as const,
        nftAddress: this.state.erc721Collection!,
        tokenId: this.state.erc721BatchTokenIds[tokenIndex],
        startingPrice: '0.05',        // Start low
        reservePrice: '0.1',          // Reserve HIGHER than start
        duration: 7,
      } : {
        auctionType: 'dutch' as const,
        nftAddress: this.state.erc721Collection!,
        tokenId: this.state.erc721BatchTokenIds[tokenIndex],
        startingPrice: '0.2',         // Start high
        endingPrice: '0.05',          // End low (minimum price)
        priceDropPerHour: '500',      // 5% per hour (500 basis points) - between MIN(100) and MAX(5000)
        duration: 7,
      };

      const originalInfo = logger.info.bind(logger);
      let auctionId: string | undefined;

      logger.info = (message: string) => {
        originalInfo(message);
        const match = message.match(/Auction ID: (0x[a-fA-F0-9]+|#\d+)/);
        if (match) {
          auctionId = match[1];
        }
      };

      await command.execute(context, args);

      logger.info = originalInfo;

      if (auctionId) {
        if (auctionType === 'english') {
          this.state.englishAuctionId = auctionId;
        } else {
          this.state.dutchAuctionId = auctionId;
        }
        if (!this.state.auctionIds) this.state.auctionIds = [];
        this.state.auctionIds.push(auctionId);
        logger.success(`✅ Created ${auctionType} auction: ${auctionId}`);
      }

      const duration = Date.now() - startTime;
      return { name: `${commandName}-${auctionType}`, category: 'auctions', success: true, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Failed: ${(error as Error).message}`);
      return { name: `${commandName}-${auctionType}`, category: 'auctions', success: false, error: (error as Error).message, duration };
    }
  }

  /**
   * Place Bid on Auction
   */
  private async runPlaceBid(context: CommandContext): Promise<CommandResult> {
    const commandName = 'place-bid';
    const startTime = Date.now();

    logger.subsection('Placing Bid on Auction');

    try {
      const command = commandRegistry.get(commandName);
      if (!command) {
        throw new Error(`Command not found: ${commandName}`);
      }

      if (!this.state.englishAuctionId) {
        throw new Error('No English auction available to bid on');
      }

      const args = {
        auctionId: this.state.englishAuctionId,
        bidAmount: '0.15', // Bid higher than starting price
      };

      await command.execute(context, args);

      logger.success(`✅ Placed bid on auction: ${this.state.englishAuctionId}`);

      const duration = Date.now() - startTime;
      return { name: commandName, category: 'auctions', success: true, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Failed: ${(error as Error).message}`);
      return { name: commandName, category: 'auctions', success: false, error: (error as Error).message, duration };
    }
  }

  /**
   * Create Offer
   */
  private async runCreateOffer(context: CommandContext): Promise<CommandResult> {
    const commandName = 'create-offer';
    const startTime = Date.now();

    logger.subsection('Creating Offer');

    try {
      const command = commandRegistry.get(commandName);
      if (!command) {
        throw new Error(`Command not found: ${commandName}`);
      }

      const args = {
        nftAddress: this.state.erc721Collection!,
        tokenId: this.state.erc721TokenIds![2], // Use third token
        offerPrice: '0.05',
        duration: 7,
      };

      await command.execute(context, args);

      const duration = Date.now() - startTime;
      logger.success(`✅ Created offer`);
      return { name: commandName, category: 'offers', success: true, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Failed: ${(error as Error).message}`);
      return { name: commandName, category: 'offers', success: false, error: (error as Error).message, duration };
    }
  }

  /**
   * Create Bundle
   */
  private async runCreateBundle(context: CommandContext): Promise<CommandResult> {
    const commandName = 'create-bundle';
    const startTime = Date.now();

    logger.subsection('Creating NFT Bundle');

    try {
      const command = commandRegistry.get(commandName);
      if (!command) {
        throw new Error(`Command not found: ${commandName}`);
      }

      if (!this.state.erc721BatchTokenIds || this.state.erc721BatchTokenIds.length < 3) {
        throw new Error('Need at least 3 tokens for bundle');
      }

      const { provider } = context;
      const bundleManagerAddress = provider.addresses.bundleManager;

      // Create bundle with 3 NFTs - use tokens 4,5,6 (won't be transferred/burned)
      const bundleTokens = this.state.erc721BatchTokenIds.slice(0, 3); // Use tokens 4,5,6 from batch (indices 0,1,2)
      const nftAddresses = bundleTokens.map(() => this.state.erc721Collection!);

      // Approve all NFTs to Bundle Manager first
      logger.info('Approving NFTs to Bundle Manager...');
      const collectionABI = await context.abiProvider.getABI('ERC721Collection');
      const collection = new (await import('ethers')).ethers.Contract(
        this.state.erc721Collection!,
        collectionABI,
        provider.signer
      );

      // Check if already approved for all
      const isApprovedForAll = await collection.isApprovedForAll!(provider.account, bundleManagerAddress);

      if (!isApprovedForAll) {
        logger.info('Setting approval for all tokens...');
        const approveTx = await collection.setApprovalForAll!(bundleManagerAddress, true);
        await (await import('@/providers/ProviderContext')).waitForTransaction(approveTx, 'Approve Bundle Manager');
        logger.success('Bundle Manager approved!');
      } else {
        logger.info('Already approved!');
      }

      const args = {
        nftAddresses,
        tokenIds: bundleTokens,
        price: '0.5',
        duration: 7,
      };

      const originalInfo = logger.info.bind(logger);
      let bundleId: string | undefined;

      logger.info = (message: string) => {
        originalInfo(message);
        const match = message.match(/Bundle ID: (0x[a-fA-F0-9]+|#\d+)/);
        if (match) {
          bundleId = match[1];
        }
      };

      await command.execute(context, args);

      logger.info = originalInfo;

      if (bundleId) {
        if (!this.state.bundleIds) this.state.bundleIds = [];
        this.state.bundleIds.push(bundleId);
        logger.success(`✅ Created bundle: ${bundleId}`);
      }

      const duration = Date.now() - startTime;
      return { name: commandName, category: 'bundles', success: true, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Failed: ${(error as Error).message}`);
      return { name: commandName, category: 'bundles', success: false, error: (error as Error).message, duration };
    }
  }

  /**
   * Transfer NFT
   */
  private async runTransferNFT(context: CommandContext): Promise<CommandResult> {
    const commandName = 'transfer-nft';
    const startTime = Date.now();

    logger.subsection('Transferring NFT');

    try {
      if (!this.state.erc721BatchTokenIds || this.state.erc721BatchTokenIds.length < 4) {
        throw new Error('No token available for transfer');
      }

      const { provider } = context;

      // Use 4th token from batch for transfer test
      const tokenToTransfer = this.state.erc721BatchTokenIds[3];

      // Transfer to a different address (account #1 if available, otherwise self)
      // For testing, we'll just transfer to the fee registry address as a placeholder
      const recipientAddress = provider.addresses.feeRegistry;

      logger.info(`Transferring token #${tokenToTransfer} from collection ${this.state.erc721Collection}`);
      logger.info(`Recipient: ${recipientAddress}`);

      // Get collection contract
      const collectionABI = await context.abiProvider.getABI('ERC721Collection');
      const collection = new (await import('ethers')).ethers.Contract(
        this.state.erc721Collection!,
        collectionABI,
        provider.signer
      );

      // Transfer the NFT
      const tx = await collection.transferFrom!(
        provider.account,
        recipientAddress,
        tokenToTransfer
      );

      await (await import('@/providers/ProviderContext')).waitForTransaction(tx, 'Transfer NFT');

      logger.success(`✅ Transferred token #${tokenToTransfer}`);

      const duration = Date.now() - startTime;
      return { name: commandName, category: 'nft-operations', success: true, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Failed: ${(error as Error).message}`);
      return { name: commandName, category: 'nft-operations', success: false, error: (error as Error).message, duration };
    }
  }

  /**
   * Burn NFT
   */
  private async runBurnNFT(context: CommandContext): Promise<CommandResult> {
    const commandName = 'burn-nft';
    const startTime = Date.now();

    logger.subsection('Burning NFT');

    try {
      if (!this.state.erc721BatchTokenIds || this.state.erc721BatchTokenIds.length < 5) {
        throw new Error('No token available for burning');
      }

      const { provider } = context;

      // Use last token from batch for burn test
      const tokenToBurn = this.state.erc721BatchTokenIds[this.state.erc721BatchTokenIds.length - 1];

      logger.info(`Burning token #${tokenToBurn} from collection ${this.state.erc721Collection}`);
      logger.warning('This is a destructive operation!');

      // Get collection contract
      const collectionABI = await context.abiProvider.getABI('ERC721Collection');
      const collection = new (await import('ethers')).ethers.Contract(
        this.state.erc721Collection!,
        collectionABI,
        provider.signer
      );

      // Burn the NFT (transfer to zero address)
      const tx = await collection.transferFrom!(
        provider.account,
        '0x000000000000000000000000000000000000dEaD', // Burn address
        tokenToBurn
      );

      await (await import('@/providers/ProviderContext')).waitForTransaction(tx, 'Burn NFT');

      logger.success(`✅ Burned token #${tokenToBurn}`);

      const duration = Date.now() - startTime;
      return { name: commandName, category: 'nft-operations', success: true, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Failed: ${(error as Error).message}`);
      return { name: commandName, category: 'nft-operations', success: false, error: (error as Error).message, duration };
    }
  }

  /**
   * Get Collection Stats
   */
  private async runCollectionStats(context: CommandContext): Promise<CommandResult> {
    const commandName = 'collection-stats';
    const startTime = Date.now();

    logger.subsection('Getting Collection Statistics');

    try {
      const command = commandRegistry.get(commandName);
      if (!command) {
        throw new Error(`Command not found: ${commandName}`);
      }

      const args = {
        collectionAddress: this.state.erc721Collection!,
      };

      await command.execute(context, args);

      const duration = Date.now() - startTime;
      logger.success(`✅ Retrieved collection stats`);
      return { name: commandName, category: 'analytics', success: true, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Failed: ${(error as Error).message}`);
      return { name: commandName, category: 'analytics', success: false, error: (error as Error).message, duration };
    }
  }

  /**
   * Display execution summary
   */
  private displaySummary(results: CommandResult[]): void {
    logger.section('📊 EXECUTION SUMMARY');
    logger.space();

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    // Overall stats
    logger.info(`Total Commands Executed: ${results.length}`);
    logger.success(`✅ Successful: ${successful.length}`);
    if (failed.length > 0) {
      logger.error(`❌ Failed: ${failed.length}`);
    }
    logger.info(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    logger.info(`⚡ Average Duration: ${(totalDuration / results.length / 1000).toFixed(2)}s`);
    logger.space();

    // Success rate
    const successRate = (successful.length / results.length) * 100;
    if (successRate === 100) {
      logger.success(`🎉 Success Rate: ${successRate.toFixed(1)}%`);
    } else if (successRate >= 80) {
      logger.warning(`⚠️  Success Rate: ${successRate.toFixed(1)}%`);
    } else {
      logger.error(`❌ Success Rate: ${successRate.toFixed(1)}%`);
    }
    logger.space();

    // Workflow state summary
    logger.section('📝 WORKFLOW STATE');
    logger.space();
    if (this.state.erc721Collection) {
      logger.info(`ERC721 Collection: ${this.state.erc721Collection}`);
      if (this.state.erc721TokenIds) {
        logger.info(`  ├─ Minted Tokens: ${this.state.erc721TokenIds.join(', ')}`);
      }
    }
    if (this.state.erc1155Collection) {
      logger.info(`ERC1155 Collection: ${this.state.erc1155Collection}`);
      if (this.state.erc1155TokenIds) {
        logger.info(`  ├─ Minted Tokens: ${this.state.erc1155TokenIds.join(', ')}`);
      }
    }
    if (this.state.listingIds && this.state.listingIds.length > 0) {
      logger.info(`Marketplace Listings: ${this.state.listingIds.length}`);
    }
    logger.space();

    // Failed commands details
    if (failed.length > 0) {
      logger.section('❌ FAILED COMMANDS');
      logger.space();
      failed.forEach((result, index) => {
        logger.error(`${index + 1}. ${result.name} (${result.category})`);
        logger.error(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);
        logger.error(`   Error: ${result.error}`);
        logger.space();
      });
    }

    // Success list by category
    if (successful.length > 0) {
      logger.section('✅ SUCCESSFUL COMMANDS BY PHASE');
      logger.space();

      const byCategory = this.groupResultsByCategory(successful);
      for (const [category, commands] of Object.entries(byCategory)) {
        logger.info(`${category.toUpperCase()}:`);
        commands.forEach(cmd => {
          logger.success(`  ✓ ${cmd.name} (${(cmd.duration / 1000).toFixed(2)}s)`);
        });
        logger.space();
      }
    }
  }

  /**
   * Group results by category
   */
  private groupResultsByCategory(results: CommandResult[]): Record<string, CommandResult[]> {
    return results.reduce((acc, result) => {
      const category = result.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(result);
      return acc;
    }, {} as Record<string, CommandResult[]>);
  }
}
