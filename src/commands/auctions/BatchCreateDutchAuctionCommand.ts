/**
 * Batch Create Dutch Auction Command
 * Creates multiple Dutch auctions for NFTs from the same collection
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext, PromptQuestion } from '@types';
import { validateAddress, validatePositiveNumber, logger } from '@utils';
import { daysToSeconds, DEFAULT_AUCTION_DURATION_DAYS } from '@/shared/constants';

interface BatchCreateDutchAuctionParams {
  collectionAddress: string;
  tokenIds: string[];
  startPrice: string;
  endPrice: string;
  duration: number;
}

export class BatchCreateDutchAuctionCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'batch-create-dutch-auction',
    description: 'Batch create Dutch auctions for multiple NFTs (1 transaction)',
    category: 'auctions',
    aliases: ['batch-dutch-auction'],
  };

  async execute(context: CommandContext, args?: BatchCreateDutchAuctionParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.collectionAddress || !args?.tokenIds || !args?.startPrice || !args?.endPrice || !args?.duration) {
        throw new Error('Missing required parameters');
      }

      if (args.tokenIds.length === 0) {
        throw new Error('At least one token ID is required');
      }

      validateAddress(args.collectionAddress, 'Collection address');
      args.tokenIds.forEach((id, i) => validatePositiveNumber(Number(id), `Token ID ${i + 1}`));
      validatePositiveNumber(Number(args.startPrice), 'Start price');
      validatePositiveNumber(Number(args.endPrice), 'End price');
      validatePositiveNumber(args.duration, 'Duration');

      if (parseFloat(args.endPrice) >= parseFloat(args.startPrice)) {
        throw new Error('End price must be less than start price');
      }

      const durationInSeconds = daysToSeconds(args.duration);

      logger.subsection('Batch Dutch Auction Details');
      logger.info(`Collection: ${args.collectionAddress}`);
      logger.info(`Number of NFTs: ${args.tokenIds.length}`);
      logger.info(`Token IDs: ${args.tokenIds.join(', ')}`);
      logger.info(`Start Price: ${args.startPrice} ETH`);
      logger.info(`End Price: ${args.endPrice} ETH`);
      logger.info(`Duration: ${args.duration} days`);
      logger.space();

      logger.info('Batch creating Dutch auctions via SDK...');
      const result = await context.sdk.auction.batchCreateDutchAuction({
        collectionAddress: args.collectionAddress,
        tokenIds: args.tokenIds,
        startPrice: args.startPrice,
        endPrice: args.endPrice,
        duration: durationInSeconds,
      });

      logger.success('Batch Dutch Auction Creation Successful!');
      logger.info(`Auction IDs: ${result.auctionIds.join(', ')}`);
      logger.info(`Transaction: ${result.tx.hash}`);

      const endTime = new Date(Date.now() + durationInSeconds * 1000);
      logger.info(`All auctions end: ${endTime.toLocaleString()}`);

      this.logSuccess(`${args.tokenIds.length} Dutch auctions created in 1 transaction!`);
    } catch (error) {
      const err = error as Error;
      this.logError(err);
      logger.error(`Failed to batch create Dutch auctions: ${err.message}`);
      throw error;
    }
  }

  async getPrompts(): Promise<PromptQuestion[]> {
    return [
      {
        type: 'input',
        name: 'collectionAddress',
        message: 'Collection address:',
        validate: (input: unknown) => {
          const addr = String(input);
          return ethers.isAddress(addr) || 'Invalid address';
        },
      },
      {
        type: 'input',
        name: 'tokenIds',
        message: 'Token IDs (comma-separated, e.g., 1,2,3):',
        filter: (input: unknown) =>
          String(input)
            .split(',')
            .map((s) => s.trim()),
        validate: (input: unknown) => {
          const ids = String(input)
            .split(',')
            .map((s) => s.trim());
          return ids.every((id) => !isNaN(Number(id))) || 'Invalid token IDs';
        },
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
    ];
  }
}
