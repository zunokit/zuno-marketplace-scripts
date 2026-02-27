/**
 * Create Dutch Auction Command
 * Creates a Dutch (descending price) auction for an NFT
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext, PromptQuestion } from '@types';
import { validateAddress, validatePositiveNumber, logger } from '@utils';
import { daysToSeconds, DEFAULT_AUCTION_DURATION_DAYS } from '@/shared/constants';

interface CreateDutchAuctionParams {
  nftAddress: string;
  tokenId: number | string;
  startPrice: string;
  endPrice: string;
  duration: number;
  amount?: number;
}

export class CreateDutchAuctionCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'create-dutch-auction',
    description: 'Create a Dutch (descending price) auction for NFT',
    category: 'auctions',
    aliases: ['dutch-auction'],
  };

  async execute(context: CommandContext, args?: CreateDutchAuctionParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.nftAddress || !args?.tokenId || !args?.startPrice || !args?.endPrice || !args?.duration) {
        throw new Error('Missing required parameters: nftAddress, tokenId, startPrice, endPrice, duration');
      }

      validateAddress(args.nftAddress, 'NFT address');
      validatePositiveNumber(Number(args.tokenId), 'Token ID');
      validatePositiveNumber(Number(args.startPrice), 'Start price');
      validatePositiveNumber(Number(args.endPrice), 'End price');
      validatePositiveNumber(args.duration, 'Duration');

      if (parseFloat(args.endPrice) >= parseFloat(args.startPrice)) {
        throw new Error('End price must be less than start price');
      }

      const durationInSeconds = daysToSeconds(args.duration);

      logger.subsection('Dutch Auction Details');
      logger.info(`NFT Contract: ${args.nftAddress}`);
      logger.info(`Token ID: ${args.tokenId}`);
      logger.info(`Start Price: ${args.startPrice} ETH`);
      logger.info(`End Price: ${args.endPrice} ETH`);
      logger.info(`Duration: ${args.duration} days`);
      logger.space();

      logger.info('Creating Dutch auction via SDK...');
      const result = await context.sdk.auction.createDutchAuction({
        collectionAddress: args.nftAddress,
        tokenId: String(args.tokenId),
        startPrice: args.startPrice,
        endPrice: args.endPrice,
        duration: durationInSeconds,
        amount: args.amount,
      });

      logger.success('Dutch Auction Created Successfully!');
      logger.info(`Auction ID: ${result.auctionId}`);
      logger.info(`Transaction: ${result.tx.hash}`);

      const endTime = new Date(Date.now() + durationInSeconds * 1000);
      logger.info(`Ends: ${endTime.toLocaleString()}`);
      logger.space();
      logger.info('Buyers can use "buy-now" command to purchase at current price');

      this.logSuccess('Dutch auction created successfully!');
    } catch (error) {
      const err = error as Error;
      this.logError(err);
      logger.error(`Failed to create Dutch auction: ${err.message}`);
      throw error;
    }
  }

  async getPrompts(): Promise<PromptQuestion[]> {
    return [
      {
        type: 'input',
        name: 'nftAddress',
        message: 'NFT contract address:',
        validate: (input: unknown) => {
          const addr = String(input);
          return ethers.isAddress(addr) || 'Invalid address';
        },
      },
      {
        type: 'input',
        name: 'tokenId',
        message: 'Token ID:',
        validate: (input: unknown) => !isNaN(Number(input)) || 'Invalid token ID',
      },
      {
        type: 'input',
        name: 'startPrice',
        message: 'Starting price (high, in ETH):',
        validate: (input: unknown) =>
          (!isNaN(Number(input)) && Number(input) > 0) || 'Invalid price',
      },
      {
        type: 'input',
        name: 'endPrice',
        message: 'Ending price (minimum, in ETH):',
        validate: (input: unknown) =>
          (!isNaN(Number(input)) && Number(input) > 0) || 'Invalid price',
      },
      {
        type: 'number',
        name: 'duration',
        message: 'Auction duration (in days):',
        default: DEFAULT_AUCTION_DURATION_DAYS,
      },
      {
        type: 'number',
        name: 'amount',
        message: 'Amount to auction (for ERC1155, default: 1):',
        default: 1,
      },
    ];
  }
}
