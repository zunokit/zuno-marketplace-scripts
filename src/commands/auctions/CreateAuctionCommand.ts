/**
 * Create Auction Command
 * Creates an English or Dutch auction for an NFT
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { validateAddress, validatePositiveNumber, logger } from '@utils';

interface CreateAuctionParams {
  auctionType: 'english' | 'dutch';
  nftAddress: string;
  tokenId: number | string;
  startingPrice: string;
  endingPrice?: string;
  reservePrice?: string;
  duration: number;
  amount?: number;
  priceDropPerHour?: string;
}

export class CreateAuctionCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'create-auction',
    description: 'Create an auction (English or Dutch) for NFT',
    category: 'auctions',
    aliases: ['auction'],
  };

  async execute(context: CommandContext, args?: CreateAuctionParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.auctionType || !args?.nftAddress || !args?.tokenId || !args?.startingPrice || !args?.duration) {
        throw new Error('Missing required parameters');
      }

      validateAddress(args.nftAddress, 'NFT address');
      validatePositiveNumber(Number(args.tokenId), 'Token ID');
      validatePositiveNumber(Number(args.startingPrice), 'Starting price');
      validatePositiveNumber(args.duration, 'Duration');

      const isEnglish = args.auctionType === 'english';
      const durationInSeconds = args.duration * 24 * 60 * 60;

      logger.subsection('Auction Details');
      logger.info(`Type: ${isEnglish ? 'English' : 'Dutch'} Auction`);
      logger.info(`NFT Contract: ${args.nftAddress}`);
      logger.info(`Token ID: ${args.tokenId}`);
      logger.info(`Starting Price: ${args.startingPrice} ETH`);
      logger.info(`Duration: ${args.duration} days`);
      logger.space();

      logger.info('Creating auction via SDK...');

      let result;
      if (isEnglish) {
        result = await context.sdk.auction.createEnglishAuction({
          collectionAddress: args.nftAddress,
          tokenId: String(args.tokenId),
          startingBid: args.startingPrice,
          reservePrice: args.reservePrice || args.startingPrice,
          duration: durationInSeconds,
          amount: args.amount,
        });
      } else {
        if (!args.endingPrice) {
          throw new Error('Dutch auction requires ending price');
        }
        result = await context.sdk.auction.createDutchAuction({
          collectionAddress: args.nftAddress,
          tokenId: String(args.tokenId),
          startPrice: args.startingPrice,
          endPrice: args.endingPrice,
          duration: durationInSeconds,
          amount: args.amount,
        });
      }

      logger.success('Auction Created Successfully!');
      logger.info(`Auction ID: ${result.auctionId}`);
      logger.info(`Transaction: ${result.tx.hash}`);

      const endTime = new Date(Date.now() + durationInSeconds * 1000);
      logger.info(`Ends: ${endTime.toLocaleString()}`);

      this.logSuccess(`${isEnglish ? 'English' : 'Dutch'} auction created successfully!`);
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
        name: 'nftAddress',
        message: 'NFT contract address:',
        validate: (input: string) => ethers.isAddress(input) || 'Invalid address',
      },
      {
        type: 'input',
        name: 'tokenId',
        message: 'Token ID:',
        validate: (input: string) => !isNaN(Number(input)) || 'Invalid token ID',
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
        name: 'priceDropPerHour',
        message: 'Price drop per hour (in basis points: 100-5000, where 100=1%, leave empty for auto):',
        when: (answers: any) => answers.auctionType === 'dutch',
        default: '',
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
      {
        type: 'number',
        name: 'amount',
        message: 'Amount to auction (for ERC1155, default: 1):',
        default: 1,
      },
    ];
  }
}
