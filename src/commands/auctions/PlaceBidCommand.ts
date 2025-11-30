/**
 * Place Bid Command
 * Places a bid on an English auction or buys from a Dutch auction
 */

import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { logger } from '@utils';

interface PlaceBidParams {
  auctionId: string;
  bidAmount?: string;
}

export class PlaceBidCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'place-bid',
    description: 'Place bid on auction or buy from Dutch auction',
    category: 'auctions',
    aliases: ['bid'],
  };

  async execute(context: CommandContext, args?: PlaceBidParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.auctionId) {
        throw new Error('Auction ID is required');
      }

      logger.info(`Auction ID: ${args.auctionId}`);
      logger.space();

      if (args.bidAmount) {
        logger.info(`Placing bid of ${args.bidAmount} ETH via SDK...`);
        const result = await context.sdk.auction.placeBid({
          auctionId: args.auctionId,
          bidAmount: args.bidAmount,
        });

        logger.success('Bid Placed Successfully!');
        logger.info(`Transaction: ${result.tx.hash}`);
      } else {
        logger.info('Buying from Dutch auction via SDK...');
        const result = await context.sdk.auction.buyNow({
          auctionId: args.auctionId,
        });

        logger.success('NFT Purchased Successfully!');
        logger.info(`Transaction: ${result.tx.hash}`);
      }

      this.logSuccess('Auction operation completed successfully!');
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
        validate: (input: string) => (input.length === 66 && input.startsWith('0x')) || 'Invalid auction ID format',
      },
      {
        type: 'input',
        name: 'bidAmount',
        message: 'Bid amount (in ETH, leave empty for Dutch auction buy):',
        default: '',
      },
    ];
  }
}
