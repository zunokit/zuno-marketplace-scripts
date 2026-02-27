/**
 * Get Pending Refund Command
 * Checks pending refund amount for a bidder
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { validateAddress, logger } from '@utils';

interface GetPendingRefundParams {
  auctionId: string;
  bidderAddress?: string;
}

export class GetPendingRefundCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'get-pending-refund',
    description: 'Get pending refund amount for a bidder',
    category: 'auctions',
    aliases: ['check-refund', 'pending-refund'],
  };

  async execute(context: CommandContext, args?: GetPendingRefundParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.auctionId) {
        throw new Error('Auction ID is required');
      }

      const bidderAddress = args?.bidderAddress || context.account;
      validateAddress(bidderAddress, 'Bidder address');

      logger.info(`Checking pending refund for auction: ${args.auctionId}`);
      logger.info(`Bidder: ${bidderAddress}`);
      logger.space();

      const refund = await context.sdk.auction.getPendingRefund(args.auctionId, bidderAddress);
      const refundAmount = parseFloat(refund);

      logger.subsection('Refund Status');
      if (refundAmount > 0) {
        logger.info(`Pending Refund: ${refund} ETH`);
        logger.space();
        logger.info('Use "withdraw-bid" command to claim your refund');
      } else {
        logger.info('No pending refund found.');
      }

      this.logSuccess('Refund status retrieved!');
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
      {
        type: 'input',
        name: 'bidderAddress',
        message: 'Bidder address (leave empty for your address):',
        default: '',
        validate: (input: string) => {
          if (!input) return true;
          return ethers.isAddress(input) || 'Invalid address';
        },
      },
    ];
  }
}
