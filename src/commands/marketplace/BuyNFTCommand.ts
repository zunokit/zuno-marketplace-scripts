/**
 * Buy NFT Command
 * Purchases an NFT from the marketplace
 */

import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { logger } from '@utils';

interface BuyNFTParams {
  listingId: string;
}

export class BuyNFTCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'buy-nft',
    description: 'Buy NFT from marketplace',
    category: 'marketplace',
    aliases: ['buy'],
  };

  async execute(context: CommandContext, args?: BuyNFTParams): Promise<void> {
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

      logger.info(`Listing ID: ${args.listingId}`);
      logger.info(`Listing ID (hex): ${listingId}`);
      logger.space();

      // Get buyer price (includes fees)
      logger.info('Fetching buyer price...');
      const buyerPrice = await context.sdk.exchange.getBuyerPrice(listingId);
      logger.info(`Total price (with fees): ${buyerPrice} ETH`);
      logger.space();

      logger.info('Purchasing NFT via SDK...');
      const result = await context.sdk.exchange.buyNFT({
        listingId,
        value: buyerPrice,
      });

      logger.success('NFT Purchased Successfully!');
      logger.info(`Transaction: ${result.tx.hash}`);

      this.logSuccess('Successfully purchased NFT!');
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
