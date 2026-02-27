/**
 * Get Collection Info Command
 * Retrieves collection metadata
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { validateAddress, logger } from '@utils';

interface GetCollectionInfoParams {
  collectionAddress: string;
}

export class GetCollectionInfoCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'get-collection-info',
    description: 'Get collection metadata and details',
    category: 'collections',
    aliases: ['collection-info', 'collection-details'],
  };

  async execute(context: CommandContext, args?: GetCollectionInfoParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.collectionAddress) {
        throw new Error('Collection address is required');
      }

      validateAddress(args.collectionAddress, 'Collection address');

      logger.info(`Fetching collection info for: ${args.collectionAddress}`);
      logger.space();

      const info = await context.sdk.collection.getCollectionInfo(args.collectionAddress);

      logger.subsection('Collection Information');
      logger.info(`Name: ${info.name}`);
      logger.info(`Symbol: ${info.symbol}`);
      logger.info(`Type: ${info.tokenType}`);
      logger.info(`Description: ${info.description || 'N/A'}`);
      logger.info(`Owner: ${info.owner}`);
      logger.space();

      logger.subsection('Token Economics');
      logger.info(`Total Supply: ${info.totalSupply}`);
      logger.info(`Max Supply: ${info.maxSupply}`);
      logger.info(`Mint Price: ${info.mintPrice} ETH`);
      logger.info(`Royalty Fee: ${(info.royaltyFee / 100).toFixed(2)}%`);
      logger.info(`Mint Limit Per Wallet: ${info.mintLimitPerWallet}`);

      this.logSuccess('Collection info retrieved!');
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
    ];
  }
}
