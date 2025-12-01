/**
 * Batch Cancel Listing Command
 * Cancels multiple NFT listings in a single transaction
 */

import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { logger } from '@utils';

interface BatchCancelListingParams {
  listingIds: string[];
}

export class BatchCancelListingCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'batch-cancel-listing',
    description: 'Batch cancel multiple NFT listings (1 transaction)',
    category: 'marketplace',
    aliases: ['batch-cancel', 'bcancel'],
  };

  async execute(context: CommandContext, args?: BatchCancelListingParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.listingIds || args.listingIds.length === 0) {
        throw new Error('At least one listing ID is required');
      }

      // Convert listing IDs to hex format if needed
      const listingIdsHex = args.listingIds.map(id => {
        if (id.startsWith('0x')) return id;
        return '0x' + BigInt(id).toString(16).padStart(64, '0');
      });

      logger.subsection('Batch Cancel Details');
      logger.info(`Number of listings to cancel: ${args.listingIds.length}`);
      args.listingIds.forEach((id, i) => {
        logger.info(`  Listing ${i + 1}: ${id}`);
      });
      logger.space();

      logger.info('Batch cancelling listings via SDK...');
      const result = await context.sdk.exchange.batchCancelListing({
        listingIds: listingIdsHex,
      });

      logger.success('Batch Cancel Successful!');
      logger.info(`Transaction: ${result.tx.hash}`);
      logger.info('Your NFTs are now unlisted and can be relisted or transferred');

      this.logSuccess(`${args.listingIds.length} listings cancelled in 1 transaction!`);
    } catch (error) {
      this.logError(error as Error);
      throw error;
    }
  }

  async getPrompts(): Promise<any[]> {
    return [
      {
        type: 'input',
        name: 'listingIds',
        message: 'Listing IDs to cancel (comma-separated):',
        filter: (input: string) => input.split(',').map(s => s.trim()),
        validate: (input: string) => input.trim().length > 0 || 'At least one listing ID required',
      },
    ];
  }
}
