/**
 * Check Allowlist Mode Command
 * Checks if a collection is in allowlist-only minting mode
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { validateAddress, logger } from '@utils';

interface CheckAllowlistModeParams {
  collectionAddress: string;
}

export class CheckAllowlistModeCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'check-allowlist-mode',
    description: 'Check if collection is in allowlist-only mode',
    category: 'collections',
    aliases: ['is-allowlist-only', 'check-mint-mode'],
  };

  async execute(context: CommandContext, args?: CheckAllowlistModeParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.collectionAddress) {
        throw new Error('Collection address is required');
      }

      validateAddress(args.collectionAddress, 'Collection address');

      logger.info(`Checking allowlist mode for: ${args.collectionAddress}`);
      logger.space();

      const isAllowlistOnly = await context.sdk.collection.isAllowlistOnly(
        args.collectionAddress
      );

      logger.subsection('Mint Mode');
      if (isAllowlistOnly) {
        logger.info('Mode: ALLOWLIST ONLY');
        logger.info('Only allowlisted addresses can mint');
      } else {
        logger.info('Mode: PUBLIC');
        logger.info('Anyone can mint from this collection');
      }

      this.logSuccess('Check complete!');
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
