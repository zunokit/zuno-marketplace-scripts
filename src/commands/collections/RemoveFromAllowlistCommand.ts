/**
 * Remove From Allowlist Command
 * Removes addresses from a collection's allowlist
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { validateAddress, logger } from '@utils';

interface RemoveFromAllowlistParams {
  collectionAddress: string;
  addresses: string[];
}

export class RemoveFromAllowlistCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'remove-from-allowlist',
    description: 'Remove addresses from collection allowlist',
    category: 'collections',
    aliases: ['allowlist-remove', 'whitelist-remove'],
  };

  async execute(context: CommandContext, args?: RemoveFromAllowlistParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.collectionAddress || !args?.addresses || args.addresses.length === 0) {
        throw new Error('Collection address and at least one address are required');
      }

      validateAddress(args.collectionAddress, 'Collection address');
      args.addresses.forEach((addr, i) => validateAddress(addr, `Address ${i + 1}`));

      logger.subsection('Allowlist Removal');
      logger.info(`Collection: ${args.collectionAddress}`);
      logger.info(`Removing ${args.addresses.length} address(es):`);
      args.addresses.forEach((addr, i) => {
        logger.info(`  ${i + 1}. ${addr}`);
      });
      logger.space();

      logger.info('Removing from allowlist via SDK...');
      const result = await context.sdk.collection.removeFromAllowlist(
        args.collectionAddress,
        args.addresses
      );

      logger.success('Addresses Removed from Allowlist!');
      logger.info(`Transaction: ${result.tx.hash}`);

      this.logSuccess(`${args.addresses.length} address(es) removed from allowlist!`);
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
        name: 'addresses',
        message: 'Addresses to remove (comma-separated):',
        filter: (input: string) => input.split(',').map(s => s.trim()),
        validate: (input: string) => {
          const addrs = input.split(',').map(s => s.trim());
          return addrs.every(a => ethers.isAddress(a)) || 'One or more invalid addresses';
        },
      },
    ];
  }
}
