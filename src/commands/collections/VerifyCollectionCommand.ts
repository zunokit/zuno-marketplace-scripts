/**
 * Verify Collection Command
 * Verifies if an address is a valid NFT collection and detects token standard
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { validateAddress, logger } from '@utils';

interface VerifyCollectionParams {
  collectionAddress: string;
}

export class VerifyCollectionCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'verify-collection',
    description: 'Verify collection and detect token standard',
    category: 'collections',
    aliases: ['check-collection', 'validate-collection'],
  };

  async execute(context: CommandContext, args?: VerifyCollectionParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.collectionAddress) {
        throw new Error('Collection address is required');
      }

      validateAddress(args.collectionAddress, 'Collection address');

      logger.info(`Verifying collection: ${args.collectionAddress}`);
      logger.space();

      const result = await context.sdk.collection.verifyCollection(args.collectionAddress);

      logger.subsection('Verification Result');
      logger.info(`Address: ${args.collectionAddress}`);
      logger.info(`Valid: ${result.isValid ? 'Yes' : 'No'}`);
      logger.info(`Token Type: ${result.tokenType}`);

      if (result.isValid) {
        logger.success('This is a valid NFT collection!');
      } else {
        logger.error('This is NOT a valid NFT collection.');
      }

      this.logSuccess('Verification complete!');
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
