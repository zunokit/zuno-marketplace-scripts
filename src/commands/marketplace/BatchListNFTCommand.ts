/**
 * Batch List NFT Command
 * Lists multiple NFTs from the same collection in a single transaction
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { validateAddress, validatePositiveNumber, logger } from '@utils';

interface BatchListNFTParams {
  collectionAddress: string;
  tokenIds: string[];
  prices: string[];
  duration: number;
}

export class BatchListNFTCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'batch-list-nft',
    description: 'Batch list multiple NFTs from the same collection (1 transaction)',
    category: 'marketplace',
    aliases: ['batch-list', 'blist'],
  };

  async execute(context: CommandContext, args?: BatchListNFTParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.collectionAddress || !args?.tokenIds || !args?.prices || !args?.duration) {
        throw new Error('Missing required parameters: collectionAddress, tokenIds, prices, duration');
      }

      if (args.tokenIds.length !== args.prices.length) {
        throw new Error('tokenIds and prices arrays must have the same length');
      }

      if (args.tokenIds.length === 0) {
        throw new Error('At least one token is required');
      }

      validateAddress(args.collectionAddress, 'Collection address');
      args.tokenIds.forEach((id, i) => validatePositiveNumber(Number(id), `Token ID ${i + 1}`));
      args.prices.forEach((price, i) => validatePositiveNumber(Number(price), `Price ${i + 1}`));
      validatePositiveNumber(args.duration, 'Duration');

      logger.subsection('Batch Listing Details');
      logger.info(`Collection: ${args.collectionAddress}`);
      logger.info(`Number of NFTs: ${args.tokenIds.length}`);
      logger.info(`Duration: ${args.duration} days`);
      logger.space();

      args.tokenIds.forEach((id, i) => {
        logger.info(`  Token #${id}: ${args.prices[i]} ETH`);
      });
      logger.space();

      logger.info('Batch listing NFTs via SDK...');
      const result = await context.sdk.exchange.batchListNFT({
        collectionAddress: args.collectionAddress,
        tokenIds: args.tokenIds,
        prices: args.prices,
        duration: args.duration * 24 * 60 * 60,
      });

      logger.success('Batch Listing Successful!');
      logger.info(`Listing IDs: ${result.listingIds.join(', ')}`);
      logger.info(`Transaction: ${result.tx.hash}`);

      const expirationDate = new Date(Date.now() + args.duration * 24 * 60 * 60 * 1000);
      logger.info(`All listings expire: ${expirationDate.toLocaleString()}`);

      this.logSuccess(`${args.tokenIds.length} NFTs listed in 1 transaction!`);
    } catch (error) {
      this.logError(error as Error);
      throw error;
    }
  }

  async getPrompts(): Promise<any[]> {
    return [
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
        name: 'prices',
        message: 'Prices in ETH (comma-separated, e.g., 0.1,0.2,0.15):',
        filter: (input: string) => input.split(',').map(s => s.trim()),
        validate: (input: string) => {
          const prices = input.split(',').map(s => s.trim());
          return prices.every(p => !isNaN(Number(p)) && Number(p) > 0) || 'Invalid prices';
        },
      },
      {
        type: 'number',
        name: 'duration',
        message: 'Listing duration (in days):',
        default: 7,
      },
    ];
  }
}
