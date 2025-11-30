/**
 * Batch Create Auction Command
 * Creates multiple auctions for NFTs from the same collection in a single transaction
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { validateAddress, validatePositiveNumber, logger } from '@utils';

interface BatchCreateAuctionParams {
  auctionType: 'english' | 'dutch';
  collectionAddress: string;
  tokenIds: string[];
  startingPrice: string;
  endingPrice?: string;
  reservePrice?: string;
  duration: number;
}

export class BatchCreateAuctionCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'batch-create-auction',
    description: 'Batch create auctions for multiple NFTs from same collection (1 transaction)',
    category: 'auctions',
    aliases: ['batch-auction', 'bauction'],
  };

  async execute(context: CommandContext, args?: BatchCreateAuctionParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.auctionType || !args?.collectionAddress || !args?.tokenIds || !args?.startingPrice || !args?.duration) {
        throw new Error('Missing required parameters');
      }

      if (args.tokenIds.length === 0) {
        throw new Error('At least one token ID is required');
      }

      validateAddress(args.collectionAddress, 'Collection address');
      args.tokenIds.forEach((id, i) => validatePositiveNumber(Number(id), `Token ID ${i + 1}`));
      validatePositiveNumber(Number(args.startingPrice), 'Starting price');
      validatePositiveNumber(args.duration, 'Duration');

      const isEnglish = args.auctionType === 'english';
      const durationInSeconds = args.duration * 24 * 60 * 60;

      logger.subsection('Batch Auction Details');
      logger.info(`Type: ${isEnglish ? 'English' : 'Dutch'} Auction`);
      logger.info(`Collection: ${args.collectionAddress}`);
      logger.info(`Number of NFTs: ${args.tokenIds.length}`);
      logger.info(`Token IDs: ${args.tokenIds.join(', ')}`);
      logger.info(`Starting Price: ${args.startingPrice} ETH`);
      logger.info(`Duration: ${args.duration} days`);
      logger.space();

      logger.info('Batch creating auctions via SDK...');

      let result;
      if (isEnglish) {
        result = await context.sdk.auction.batchCreateEnglishAuction({
          collectionAddress: args.collectionAddress,
          tokenIds: args.tokenIds,
          startingBid: args.startingPrice,
          reservePrice: args.reservePrice || args.startingPrice,
          duration: durationInSeconds,
        });
      } else {
        if (!args.endingPrice) {
          throw new Error('Dutch auction requires ending price');
        }
        result = await context.sdk.auction.batchCreateDutchAuction({
          collectionAddress: args.collectionAddress,
          tokenIds: args.tokenIds,
          startPrice: args.startingPrice,
          endPrice: args.endingPrice,
          duration: durationInSeconds,
        });
      }

      logger.success('Batch Auction Creation Successful!');
      logger.info(`Auction IDs: ${result.auctionIds.join(', ')}`);
      logger.info(`Transaction: ${result.tx.hash}`);

      const endTime = new Date(Date.now() + durationInSeconds * 1000);
      logger.info(`All auctions end: ${endTime.toLocaleString()}`);

      this.logSuccess(`${args.tokenIds.length} ${isEnglish ? 'English' : 'Dutch'} auctions created in 1 transaction!`);
    } catch (error) {
      this.logError(error as Error);
      throw error;
    }
  }

  async getPrompts(): Promise<any[]> {
    return [
      {
        type: 'list',
        name: 'auctionType',
        message: 'Select auction type:',
        choices: [
          { name: 'English Auction (ascending bids)', value: 'english' },
          { name: 'Dutch Auction (descending price)', value: 'dutch' },
        ],
      },
      {
        type: 'input',
        name: 'collectionAddress',
        message: 'Collection address:',
        validate: (input: string) => ethers.isAddress(input) || 'Invalid address',
      },
      {
        type: 'input',
        name: 'tokenIds',
        message: 'Token IDs (comma-separated, e.g., 1,2,3):',
        filter: (input: string) => input.split(',').map(s => s.trim()),
        validate: (input: string) => {
          const ids = input.split(',').map(s => s.trim());
          return ids.every(id => !isNaN(Number(id))) || 'Invalid token IDs';
        },
      },
      {
        type: 'input',
        name: 'startingPrice',
        message: (answers: any) =>
          answers.auctionType === 'english' ? 'Starting bid (in ETH):' : 'Starting price (high, in ETH):',
        validate: (input: string) => (!isNaN(Number(input)) && Number(input) > 0) || 'Invalid price',
      },
      {
        type: 'input',
        name: 'endingPrice',
        message: 'Ending price (minimum price, in ETH):',
        when: (answers: any) => answers.auctionType === 'dutch',
        validate: (input: string) => (!isNaN(Number(input)) && Number(input) > 0) || 'Invalid price',
      },
      {
        type: 'input',
        name: 'reservePrice',
        message: 'Reserve price (in ETH, leave empty to use starting price):',
        when: (answers: any) => answers.auctionType === 'english',
        default: '',
      },
      {
        type: 'number',
        name: 'duration',
        message: 'Auction duration (in days):',
        default: 7,
      },
    ];
  }
}
