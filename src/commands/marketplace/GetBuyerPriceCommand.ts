/**
 * Get Buyer Price Command
 * Calculates total price including fees for a listing
 */

import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { logger } from '@utils';

interface GetBuyerPriceParams {
  listingId: string;
}

export class GetBuyerPriceCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'get-buyer-price',
    description: 'Get total price including fees for a listing',
    category: 'marketplace',
    aliases: ['calc-price', 'total-price'],
  };

  async execute(context: CommandContext, args?: GetBuyerPriceParams): Promise<void> {
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

      logger.info(`Calculating price for listing: ${listingId}`);
      logger.space();

      const [listing, buyerPrice] = await Promise.all([
        context.sdk.exchange.getListing(listingId),
        context.sdk.exchange.getBuyerPrice(listingId),
      ]);

      const basePrice = parseFloat(listing.price);
      const totalPrice = parseFloat(buyerPrice);
      const fees = totalPrice - basePrice;
      const feePercentage = (fees / basePrice) * 100;

      logger.subsection('Price Breakdown');
      logger.info(`Base Price: ${listing.price} ETH`);
      logger.info(`Fees: ${fees.toFixed(6)} ETH (${feePercentage.toFixed(2)}%)`);
      logger.info(`------------------------`);
      logger.info(`Total: ${buyerPrice} ETH`);

      this.logSuccess('Price calculated!');
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
        validate: (input: string) => input.length > 0 || 'Listing ID is required',
      },
    ];
  }
}
