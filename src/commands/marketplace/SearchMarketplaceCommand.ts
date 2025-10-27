/**
 * Search Marketplace Command
 * Search and filter marketplace listings
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { logger } from '@utils';

interface SearchParams {
  collection?: string;
  minPrice?: string;
  maxPrice?: string;
  tokenType?: 'erc721' | 'erc1155' | 'both';
  limit?: number;
}

export class SearchMarketplaceCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'search-marketplace',
    description: 'Search and filter marketplace listings',
    category: 'marketplace',
    aliases: ['search', 'browse'],
  };

  async execute(context: CommandContext, args?: SearchParams): Promise<void> {
    this.logStart();

    try {
      const { provider } = context;

      const minPrice = args?.minPrice ? ethers.parseEther(args.minPrice) : 0n;
      const maxPrice = args?.maxPrice ? ethers.parseEther(args.maxPrice) : ethers.MaxUint256;
      const limit = args?.limit || 20;
      const tokenType = args?.tokenType || 'both';

      logger.subsection('Marketplace Search');
      if (args?.collection) logger.info(`Collection: ${args.collection}`);
      if (args?.minPrice) logger.info(`Min Price: ${args.minPrice} ETH`);
      if (args?.maxPrice) logger.info(`Max Price: ${args.maxPrice} ETH`);
      logger.info(`Token Type: ${tokenType.toUpperCase()}`);
      logger.space();

      let foundListings = 0;

      // Search ERC721 listings
      if (tokenType === 'erc721' || tokenType === 'both') {
        const erc721ABI = await context.abiProvider.getABI('ERC721NFTExchange');
        const erc721Exchange = new ethers.Contract(
          provider.addresses.erc721Exchange,
          erc721ABI,
          provider.provider
        );

        const collection = args?.collection || ethers.ZeroAddress;

        try {
          const listingIds = await erc721Exchange.getListingsByCollection!(collection);

          logger.subsection('ERC721 Listings');
          let shown = 0;

          for (const listingId of listingIds) {
            if (foundListings >= limit) break;

            const listing = await erc721Exchange.s_listings!(listingId);

            // Filter: active, not expired, price range
            const now = Math.floor(Date.now() / 1000);
            const isActive =
              Number(listing.status) === 1 &&
              now < Number(listing.listingStart) + Number(listing.listingDuration);
            const inPriceRange = listing.price >= minPrice && listing.price <= maxPrice;

            if (!isActive || !inPriceRange) continue;

            logger.info(`\n[${foundListings + 1}] Listing ID: ${listingId}`);
            logger.info(`    Collection: ${listing.contractAddress}`);
            logger.info(`    Token ID: ${listing.tokenId.toString()}`);
            logger.info(`    Price: ${ethers.formatEther(listing.price)} ETH`);
            logger.info(`    Seller: ${listing.seller}`);

            const expiresAt = new Date(
              (Number(listing.listingStart) + Number(listing.listingDuration)) * 1000
            );
            logger.info(`    Expires: ${expiresAt.toLocaleString()}`);

            foundListings++;
            shown++;
          }

          if (shown === 0 && tokenType === 'erc721') {
            logger.info('No ERC721 listings found matching criteria');
          }

          logger.space();
        } catch (error) {
          logger.warning('Error fetching ERC721 listings: ' + (error as Error).message);
          logger.debug('This may indicate the collection has no listings or the exchange contract needs verification');
        }
      }

      // Search ERC1155 listings
      if (tokenType === 'erc1155' || tokenType === 'both') {
        const erc1155ABI = await context.abiProvider.getABI('ERC1155NFTExchange');
        const erc1155Exchange = new ethers.Contract(
          provider.addresses.erc1155Exchange,
          erc1155ABI,
          provider.provider
        );

        const collection = args?.collection || ethers.ZeroAddress;

        try {
          const listingIds = await erc1155Exchange.getListingsByCollection!(collection);

          logger.subsection('ERC1155 Listings');
          let shown = 0;

          for (const listingId of listingIds) {
            if (foundListings >= limit) break;

            const listing = await erc1155Exchange.s_listings!(listingId);

            // Filter: active, not expired, price range
            const now = Math.floor(Date.now() / 1000);
            const isActive =
              Number(listing.status) === 1 &&
              now < Number(listing.listingStart) + Number(listing.listingDuration);
            const inPriceRange = listing.price >= minPrice && listing.price <= maxPrice;

            if (!isActive || !inPriceRange) continue;

            logger.info(`\n[${foundListings + 1}] Listing ID: ${listingId}`);
            logger.info(`    Collection: ${listing.contractAddress}`);
            logger.info(`    Token ID: ${listing.tokenId.toString()}`);
            logger.info(`    Amount Available: ${listing.amount.toString()}`);
            logger.info(`    Price: ${ethers.formatEther(listing.price)} ETH (per unit)`);
            logger.info(`    Seller: ${listing.seller}`);

            const expiresAt = new Date(
              (Number(listing.listingStart) + Number(listing.listingDuration)) * 1000
            );
            logger.info(`    Expires: ${expiresAt.toLocaleString()}`);

            foundListings++;
            shown++;
          }

          if (shown === 0 && tokenType === 'erc1155') {
            logger.info('No ERC1155 listings found matching criteria');
          }

          logger.space();
        } catch (error) {
          logger.warning('Error fetching ERC1155 listings: ' + (error as Error).message);
          logger.debug('This may indicate the collection has no listings or the exchange contract needs verification');
        }
      }

      if (foundListings === 0) {
        logger.info('No listings found matching your criteria');
        logger.info('Try adjusting your search parameters');
      } else {
        logger.success(`Found ${foundListings} listing(s)`);
        logger.info('Use "buy-nft <listingId>" to purchase');
      }

      this.logSuccess('Search complete');
    } catch (error) {
      this.logError(error as Error);
      throw error;
    }
  }

  async getPrompts(): Promise<any[]> {
    return [
      {
        type: 'input',
        name: 'collection',
        message: 'NFT Collection address (leave empty for all):',
        default: '',
      },
      {
        type: 'input',
        name: 'minPrice',
        message: 'Minimum price in ETH (leave empty for no min):',
        default: '',
      },
      {
        type: 'input',
        name: 'maxPrice',
        message: 'Maximum price in ETH (leave empty for no max):',
        default: '',
      },
      {
        type: 'list',
        name: 'tokenType',
        message: 'Token type:',
        choices: ['both', 'erc721', 'erc1155'],
        default: 'both',
      },
      {
        type: 'number',
        name: 'limit',
        message: 'Maximum results:',
        default: 20,
      },
    ];
  }
}
