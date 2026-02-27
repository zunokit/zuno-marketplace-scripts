/**
 * List Collections Command
 * Lists all created collections from factory events
 */

import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { logger } from '@utils';

interface ListCollectionsParams {
  creatorAddress?: string;
}

export class ListCollectionsCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'list-collections',
    description: 'List all created collections from factory events',
    category: 'collections',
    aliases: ['collections', 'show-collections'],
  };

  async execute(context: CommandContext, args?: ListCollectionsParams): Promise<void> {
    this.logStart();

    try {
      logger.info('Fetching created collections from factory events...');
      if (args?.creatorAddress) {
        logger.info(`Filtering by creator: ${args.creatorAddress}`);
      }
      logger.space();

      const options: { creator?: string } = {};
      if (args?.creatorAddress) {
        options.creator = args.creatorAddress;
      }

      const collections = await context.sdk.collection.getCreatedCollections(options);

      if (collections.length === 0) {
        logger.info('No collections found.');
        return;
      }

      logger.subsection(`Found ${collections.length} Collection(s)`);

      collections.forEach((collection, index) => {
        logger.info(`\n[${index + 1}] ${collection.type} Collection`);
        logger.info(`    Address: ${collection.address}`);
        logger.info(`    Creator: ${collection.creator}`);
        logger.info(`    Block: ${collection.blockNumber}`);
        logger.info(`    Tx Hash: ${collection.transactionHash}`);
      });

      this.logSuccess(`${collections.length} collection(s) retrieved!`);
    } catch (error) {
      this.logError(error as Error);
      throw error;
    }
  }

  async getPrompts(): Promise<any[]> {
    return [
      {
        type: 'input',
        name: 'creatorAddress',
        message: 'Filter by creator address (leave empty for all):',
        default: '',
      },
    ];
  }
}
