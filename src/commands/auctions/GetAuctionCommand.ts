/**
 * Get Auction Command
 * Retrieves auction details by ID
 */

import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { logger } from '@utils';

interface GetAuctionParams {
  auctionId: string;
}

export class GetAuctionCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'get-auction',
    description: 'Get auction details by ID',
    category: 'auctions',
    aliases: ['auction-info'],
  };

  async execute(context: CommandContext, args?: GetAuctionParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.auctionId) {
        throw new Error('Auction ID is required');
      }

      logger.info(`Fetching auction details for: ${args.auctionId}`);
      logger.space();

      const auction = await context.sdk.auction.getAuctionFromFactory(args.auctionId);

      logger.subsection('Auction Details');
      logger.info(`ID: ${auction.id}`);
      logger.info(`Type: ${auction.type === 'english' ? 'English' : 'Dutch'} Auction`);
      logger.info(`Seller: ${auction.seller}`);
      logger.info(`Collection: ${auction.collectionAddress}`);
      logger.info(`Token ID: ${auction.tokenId}`);

      if (auction.type === 'english') {
        logger.info(`Starting Bid: ${auction.startingBid} ETH`);
        if (auction.reservePrice) {
          logger.info(`Reserve Price: ${auction.reservePrice} ETH`);
        }
        logger.info(`Current Bid: ${auction.currentBid} ETH`);
        if (auction.highestBidder && auction.highestBidder !== '0x0000000000000000000000000000000000000000') {
          logger.info(`Highest Bidder: ${auction.highestBidder}`);
        }
      } else {
        logger.info(`Start Price: ${auction.startPrice} ETH`);
        logger.info(`End Price: ${auction.endPrice} ETH`);

        // Get current price for Dutch auction
        try {
          const currentPrice = await context.sdk.auction.getCurrentPrice(args.auctionId);
          logger.info(`Current Price: ${currentPrice} ETH`);
        } catch {
          // Auction might be ended
        }
      }

      logger.info(`Status: ${auction.status}`);
      logger.info(`Start Time: ${new Date(auction.startTime * 1000).toLocaleString()}`);
      logger.info(`End Time: ${new Date(auction.endTime * 1000).toLocaleString()}`);

      this.logSuccess('Auction details retrieved!');
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
