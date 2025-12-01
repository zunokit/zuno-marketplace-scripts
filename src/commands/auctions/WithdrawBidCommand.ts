/**
 * Withdraw Bid Command
 * Withdraws a bid from an auction (for outbid bidders)
 */

import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { logger } from '@utils';

interface WithdrawBidParams {
  auctionId: string;
}

export class WithdrawBidCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'withdraw-bid',
    description: 'Withdraw your bid from an auction',
    category: 'auctions',
    aliases: ['refund-bid', 'claim-bid'],
  };

  async execute(context: CommandContext, args?: WithdrawBidParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.auctionId) {
        throw new Error('Auction ID is required');
      }

      logger.info(`Auction ID: ${args.auctionId}`);
      logger.space();

      logger.info('Withdrawing bid via SDK...');
      // SDK expects: withdrawBid(auctionId)
      const result = await context.sdk.auction.withdrawBid(args.auctionId);

      logger.success('Bid Withdrawn Successfully!');
      logger.info(`Transaction: ${result.tx.hash}`);
      logger.info('Your bid amount has been refunded to your wallet');

      this.logSuccess('Bid withdrawn successfully!');
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
        message: 'Auction ID to withdraw bid from:',
        validate: (input: string) => input.length > 0 || 'Auction ID is required',
      },
    ];
  }
}
