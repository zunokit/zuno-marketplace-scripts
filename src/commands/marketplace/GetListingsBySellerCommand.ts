/**
 * Get Listings By Seller Command
 * Retrieves all listings by a specific seller
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { validateAddress, logger } from '@utils';

interface GetListingsBySellerParams {
  sellerAddress?: string;
}

export class GetListingsBySellerCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'get-listings-by-seller',
    description: 'Get all listings by a seller',
    category: 'marketplace',
    aliases: ['my-listings', 'seller-listings'],
  };

  async execute(context: CommandContext, args?: GetListingsBySellerParams): Promise<void> {
    this.logStart();

    try {
      const sellerAddress = args?.sellerAddress || context.account;

      validateAddress(sellerAddress, 'Seller address');

      logger.info(`Fetching listings for seller: ${sellerAddress}`);
      logger.space();

      const listings = await context.sdk.exchange.getListingsBySeller(sellerAddress);

      if (listings.length === 0) {
        logger.info('No active listings found for this seller.');
        return;
      }

      logger.subsection(`Found ${listings.length} Listing(s)`);

      listings.forEach((listing, index) => {
        logger.info(`\n[${index + 1}] Listing ID: ${listing.id}`);
        logger.info(`    Collection: ${listing.collectionAddress}`);
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
        name: 'sellerAddress',
        message: 'Seller address (leave empty for your address):',
        default: '',
        validate: (input: string) => {
          if (!input) return true;
          return ethers.isAddress(input) || 'Invalid address';
        },
      },
    ];
  }
}
