/**
 * Get Listing Command
 * Retrieves listing details by ID
 */

import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { logger } from '@utils';

interface GetListingParams {
  listingId: string;
}

export class GetListingCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'get-listing',
    description: 'Get listing details by ID',
    category: 'marketplace',
    aliases: ['listing-info'],
  };

  async execute(context: CommandContext, args?: GetListingParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.listingId) {
        throw new Error('Listing ID is required');
      }

      // Convert listing ID to hex format if it's a decimal string
      let listingId = args.listingId;
      if (!listingId.startsWith('0x')) {
        listingId = '0x' + BigInt(listingId).toString(16).padStart(64, '0');
      }

      logger.info(`Fetching listing details for: ${listingId}`);
      logger.space();

      const listing = await context.sdk.exchange.getListing(listingId);

      logger.subsection('Listing Details');
      logger.info(`ID: ${listing.id}`);
      logger.info(`Seller: ${listing.seller}`);
      logger.info(`Collection: ${listing.collectionAddress}`);
      logger.info(`Token ID: ${listing.tokenId}`);
      logger.info(`Price: ${listing.price} ETH`);
      if (listing.amount) {
        logger.info(`Amount: ${listing.amount}`);
      }
      logger.info(`Status: ${listing.status}`);
      logger.info(`Start Time: ${new Date(listing.startTime * 1000).toLocaleString()}`);
      logger.info(`End Time: ${new Date(listing.endTime * 1000).toLocaleString()}`);
      logger.info(`Payment Token: ${listing.paymentToken}`);

      // Get buyer price with fees
      logger.space();
      const buyerPrice = await context.sdk.exchange.getBuyerPrice(listingId);
      logger.info(`Buyer Price (with fees): ${buyerPrice} ETH`);

      this.logSuccess('Listing details retrieved!');
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
        message: 'Listing ID:',
        validate: (input: string) => input.length > 0 || 'Listing ID is required',
      },
    ];
  }
}
