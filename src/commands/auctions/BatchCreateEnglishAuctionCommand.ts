/**
 * Batch Create English Auction Command
 * Creates multiple English auctions for NFTs from the same collection
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext, PromptQuestion } from '@types';
import { validateAddress, validatePositiveNumber, logger } from '@utils';
import { daysToSeconds, DEFAULT_AUCTION_DURATION_DAYS } from '@/shared/constants';

interface BatchCreateEnglishAuctionParams {
  collectionAddress: string;
  tokenIds: string[];
  startingBid: string;
  reservePrice?: string;
  duration: number;
}

export class BatchCreateEnglishAuctionCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'batch-create-english-auction',
    description: 'Batch create English auctions for multiple NFTs (1 transaction)',
    category: 'auctions',
    aliases: ['batch-english-auction'],
  };

  async execute(context: CommandContext, args?: BatchCreateEnglishAuctionParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.collectionAddress || !args?.tokenIds || !args?.startingBid || !args?.duration) {
        throw new Error('Missing required parameters');
      }

      if (args.tokenIds.length === 0) {
        throw new Error('At least one token ID is required');
      }

      validateAddress(args.collectionAddress, 'Collection address');
      args.tokenIds.forEach((id, i) => validatePositiveNumber(Number(id), `Token ID ${i + 1}`));
      validatePositiveNumber(Number(args.startingBid), 'Starting bid');
      validatePositiveNumber(args.duration, 'Duration');

      const durationInSeconds = daysToSeconds(args.duration);

      logger.subsection('Batch English Auction Details');
      logger.info(`Collection: ${args.collectionAddress}`);
      logger.info(`Number of NFTs: ${args.tokenIds.length}`);
      logger.info(`Token IDs: ${args.tokenIds.join(', ')}`);
      logger.info(`Starting Bid: ${args.startingBid} ETH`);
      if (args.reservePrice) {
        logger.info(`Reserve Price: ${args.reservePrice} ETH`);
      }
      logger.info(`Duration: ${args.duration} days`);
      logger.space();

      logger.info('Batch creating English auctions via SDK...');
      const result = await context.sdk.auction.batchCreateEnglishAuction({
        collectionAddress: args.collectionAddress,
        tokenIds: args.tokenIds,
        startingBid: args.startingBid,
        reservePrice: args.reservePrice,
        duration: durationInSeconds,
      });

      logger.success('Batch English Auction Creation Successful!');
      logger.info(`Auction IDs: ${result.auctionIds.join(', ')}`);
      logger.info(`Transaction: ${result.tx.hash}`);

      const endTime = new Date(Date.now() + durationInSeconds * 1000);
      logger.info(`All auctions end: ${endTime.toLocaleString()}`);

      this.logSuccess(`${args.tokenIds.length} English auctions created in 1 transaction!`);
    } catch (error) {
      const err = error as Error;
      this.logError(err);
      logger.error(`Failed to batch create English auctions: ${err.message}`);
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
        name: 'startingBid',
        message: 'Starting bid (in ETH):',
        validate: (input: unknown) =>
          (!isNaN(Number(input)) && Number(input) > 0) || 'Invalid price',
      },
      {
        type: 'input',
        name: 'reservePrice',
        message: 'Reserve price (in ETH, leave empty for no reserve):',
        default: '',
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
