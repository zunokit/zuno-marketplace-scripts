/**
 * Check Allowlist Command
 * Checks if an address is in a collection's allowlist
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { validateAddress, logger } from '@utils';

interface CheckAllowlistParams {
  collectionAddress: string;
  address?: string;
}

export class CheckAllowlistCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'check-allowlist',
    description: 'Check if an address is in the allowlist',
    category: 'collections',
    aliases: ['is-in-allowlist', 'check-whitelist'],
  };

  async execute(context: CommandContext, args?: CheckAllowlistParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.collectionAddress) {
        throw new Error('Collection address is required');
      }

      validateAddress(args.collectionAddress, 'Collection address');
      const address = args?.address || context.account;
      validateAddress(address, 'Address');

      logger.info(`Checking allowlist status...`);
      logger.info(`Collection: ${args.collectionAddress}`);
      logger.info(`Address: ${address}`);
      logger.space();

      const isInAllowlist = await context.sdk.collection.isInAllowlist(
        args.collectionAddress,
        address
      );

      logger.subsection('Allowlist Status');
      if (isInAllowlist) {
        logger.success(`${address} IS in the allowlist`);
      } else {
        logger.error(`${address} is NOT in the allowlist`);
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
      {
        type: 'input',
        name: 'address',
        message: 'Address to check (leave empty for your address):',
        default: '',
        validate: (input: string) => {
          if (!input) return true;
          return ethers.isAddress(input) || 'Invalid address';
        },
      },
    ];
  }
}
