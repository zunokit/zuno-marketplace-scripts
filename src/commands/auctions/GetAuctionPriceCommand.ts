/**
 * Get Auction Price Command
 * Gets current price of a Dutch auction
 */

import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { logger } from '@utils';

interface GetAuctionPriceParams {
  auctionId: string;
}

export class GetAuctionPriceCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'get-auction-price',
    description: 'Get current price of a Dutch auction',
    category: 'auctions',
    aliases: ['dutch-price', 'current-price'],
  };

  async execute(context: CommandContext, args?: GetAuctionPriceParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.auctionId) {
        throw new Error('Auction ID is required');
      }

      logger.info(`Fetching current price for auction: ${args.auctionId}`);
      logger.space();

      const [auction, currentPrice] = await Promise.all([
        context.sdk.auction.getAuctionFromFactory(args.auctionId),
        context.sdk.auction.getCurrentPrice(args.auctionId),
      ]);

      if (auction.type !== 'dutch') {
        throw new Error('This command only works for Dutch auctions');
      }

      const startPrice = parseFloat(auction.startPrice!);
      const now = Date.now() / 1000;
      const progress = ((now - auction.startTime) / (auction.endTime - auction.startTime)) * 100;

      logger.subsection('Dutch Auction Price');
      logger.info(`Start Price: ${auction.startPrice} ETH`);
      logger.info(`End Price: ${auction.endPrice} ETH`);
      logger.info(`Current Price: ${currentPrice} ETH`);
      logger.info(`Price Drop: ${((1 - parseFloat(currentPrice) / startPrice) * 100).toFixed(2)}%`);
      logger.info(`Auction Progress: ${Math.min(100, progress).toFixed(1)}%`);
      logger.info(`Status: ${auction.status}`);

      if (now < auction.endTime && auction.status === 'active') {
        logger.space();
        logger.info('Use "buy-now" command to purchase at current price');
      }

      this.logSuccess('Price retrieved!');
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
