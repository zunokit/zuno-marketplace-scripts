/**
 * Batch Cancel Auction Command
 * Cancels multiple auctions in a single transaction
 */

import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { logger } from '@utils';

interface BatchCancelAuctionParams {
  auctionIds: string[];
}

export class BatchCancelAuctionCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'batch-cancel-auction',
    description: 'Batch cancel multiple auctions (1 transaction)',
    category: 'auctions',
    aliases: ['batch-auction-cancel', 'bauction-cancel'],
  };

  async execute(context: CommandContext, args?: BatchCancelAuctionParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.auctionIds || args.auctionIds.length === 0) {
        throw new Error('At least one auction ID is required');
      }

      logger.subsection('Batch Cancel Auctions');
      logger.info(`Number of auctions to cancel: ${args.auctionIds.length}`);
      args.auctionIds.forEach((id, i) => {
        logger.info(`  Auction ${i + 1}: ${id}`);
      });
      logger.space();

      logger.info('Batch cancelling auctions via SDK...');
      const result = await context.sdk.auction.batchCancelAuction(args.auctionIds);

      logger.success('Batch Cancel Successful!');
      logger.info(`Cancelled: ${result.cancelledCount} auction(s)`);
      logger.info(`Transaction: ${result.tx.hash}`);
      logger.info('Your NFTs have been returned to your wallet');

      this.logSuccess(`${result.cancelledCount} auctions cancelled in 1 transaction!`);
    } catch (error) {
      this.logError(error as Error);
      throw error;
    }
  }

  async getPrompts(): Promise<any[]> {
    return [
      {
        type: 'input',
        name: 'auctionIds',
        message: 'Auction IDs to cancel (comma-separated):',
        filter: (input: string) => input.split(',').map(s => s.trim()),
        validate: (input: string) => input.trim().length > 0 || 'At least one auction ID required',
      },
    ];
  }
}
