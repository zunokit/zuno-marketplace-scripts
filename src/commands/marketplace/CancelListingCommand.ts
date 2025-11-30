/**
 * Cancel Listing Command
 * Cancels an active NFT listing on the marketplace
 */

import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { logger } from '@utils';

interface CancelListingParams {
  listingId: string;
}

export class CancelListingCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'cancel-listing',
    description: 'Cancel an active NFT listing',
    category: 'marketplace',
    aliases: ['cancel'],
  };

  async execute(context: CommandContext, args?: CancelListingParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.listingId) {
        throw new Error('Listing ID is required');
      }

      logger.info(`Listing ID: ${args.listingId}`);
      logger.space();

      logger.info('Cancelling listing via SDK...');
      const result = await context.sdk.exchange.cancelListing({
        listingId: args.listingId,
      });

      logger.success('Listing Cancelled Successfully!');
      logger.info(`Transaction: ${result.tx.hash}`);
      logger.info('Your NFT is now unlisted and can be relisted or transferred');

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
        message: 'Listing ID:',
      },
    ];
  }
}
