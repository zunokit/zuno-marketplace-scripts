/**
 * Settle Auction Command
 * Settles a completed auction and transfers the NFT to the winner
 */

import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { logger } from '@utils';

interface SettleAuctionParams {
  auctionId: string;
}

export class SettleAuctionCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'settle-auction',
    description: 'Settle a completed auction and transfer NFT to winner',
    category: 'auctions',
    aliases: ['finalize-auction', 'end-auction'],
  };

  async execute(context: CommandContext, args?: SettleAuctionParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.auctionId) {
        throw new Error('Auction ID is required');
      }

      logger.info(`Auction ID: ${args.auctionId}`);
      logger.space();

      logger.info('Settling auction via SDK...');
      const result = await context.sdk.auction.settleAuction({
        auctionId: args.auctionId,
      });

      logger.success('Auction Settled Successfully!');
      logger.info(`Transaction: ${result.tx.hash}`);
      logger.info('NFT has been transferred to the winning bidder');
      logger.info('Payment has been sent to the seller');

      this.logSuccess('Auction settled successfully!');
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
        message: 'Auction ID to settle:',
        validate: (input: string) => input.length > 0 || 'Auction ID is required',
      },
    ];
  }
}
