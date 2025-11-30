/**
 * Cancel Auction Command
 * Cancels an active auction
 */

import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { logger } from '@utils';

interface CancelAuctionParams {
  auctionId: string;
}

export class CancelAuctionCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'cancel-auction',
    description: 'Cancel an active auction',
    category: 'auctions',
    aliases: ['auction-cancel'],
  };

  async execute(context: CommandContext, args?: CancelAuctionParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.auctionId) {
        throw new Error('Auction ID is required');
      }

      logger.info(`Auction ID: ${args.auctionId}`);
      logger.space();

      logger.info('Cancelling auction via SDK...');
      const result = await context.sdk.auction.cancelAuction({
        auctionId: args.auctionId,
      });

      logger.success('Auction Cancelled Successfully!');
      logger.info(`Transaction: ${result.tx.hash}`);
      logger.info('Your NFT has been returned to your wallet');

      this.logSuccess('Auction cancelled successfully!');
    } catch (error) {
      this.logError(error as Error);
      throw error;
    }
  }

  async getPrompts(): Promise<any[]> {
    return [
      {
        type: 'input',
        name: 'auctionId',
        message: 'Auction ID:',
        validate: (input: string) => input.length > 0 || 'Auction ID is required',
      },
    ];
  }
}
