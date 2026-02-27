/**
 * Get Listings Command
 * Retrieves all listings for a collection
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { validateAddress, logger } from '@utils';

interface GetListingsParams {
  collectionAddress: string;
}

export class GetListingsCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'get-listings',
    description: 'Get all listings for a collection',
    category: 'marketplace',
    aliases: ['listings'],
  };

  async execute(context: CommandContext, args?: GetListingsParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.collectionAddress) {
        throw new Error('Collection address is required');
      }

      validateAddress(args.collectionAddress, 'Collection address');

      logger.info(`Fetching listings for: ${args.collectionAddress}`);
      logger.space();

      const listings = await context.sdk.exchange.getListings(args.collectionAddress);

      if (listings.length === 0) {
        logger.info('No active listings found for this collection.');
        return;
      }

      logger.subsection(`Found ${listings.length} Listing(s)`);

      listings.forEach((listing, index) => {
        logger.info(`\n[${index + 1}] Listing ID: ${listing.id}`);
        logger.info(`    Seller: ${listing.seller}`);
        logger.info(`    Token ID: ${listing.tokenId}`);
        logger.info(`    Price: ${listing.price} ETH`);
        if (listing.amount) {
          logger.info(`    Amount: ${listing.amount}`);
        }
        logger.info(`    Status: ${listing.status}`);
        logger.info(`    Expires: ${new Date(listing.endTime * 1000).toLocaleString()}`);
      });

      this.logSuccess(`${listings.length} listing(s) retrieved!`);
    } catch (error) {
      this.logError(error as Error);
      throw error;
    }
  }

  async getPrompts(): Promise<any[]> {
    return [
      {
        type: 'input',
        name: 'collectionAddress',
        message: 'Collection address:',
        validate: (input: string) => ethers.isAddress(input) || 'Invalid address',
      },
    ];
  }
}
