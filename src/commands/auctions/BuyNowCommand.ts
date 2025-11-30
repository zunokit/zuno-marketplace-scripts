/**
 * Buy Now Command
 * Instantly purchases from a Dutch auction at the current price
 */

import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { logger } from '@utils';

interface BuyNowParams {
  auctionId: string;
}

export class BuyNowCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'buy-now',
    description: 'Instantly buy from a Dutch auction at current price',
    category: 'auctions',
    aliases: ['dutch-buy', 'instant-buy'],
  };

  async execute(context: CommandContext, args?: BuyNowParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.auctionId) {
        throw new Error('Auction ID is required');
      }

      logger.info(`Auction ID: ${args.auctionId}`);
      logger.space();

      logger.info('Purchasing from Dutch auction via SDK...');
      const result = await context.sdk.auction.buyNow(args.auctionId);

      logger.success('Purchase Successful!');
      logger.info(`Transaction: ${result.tx.hash}`);
      logger.info('The NFT has been transferred to your wallet');

      this.logSuccess('Successfully purchased NFT from Dutch auction!');
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
        message: 'Dutch Auction ID:',
        validate: (input: string) => input.length > 0 || 'Auction ID is required',
      },
    ];
  }
}
