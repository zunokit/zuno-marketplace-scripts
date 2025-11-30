/**
 * Add To Allowlist Command
 * Adds addresses to a collection's allowlist for early minting access
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { validateAddress, logger } from '@utils';

interface AddToAllowlistParams {
  collectionAddress: string;
  addresses: string[];
}

export class AddToAllowlistCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'add-to-allowlist',
    description: 'Add addresses to collection allowlist',
    category: 'collections',
    aliases: ['allowlist-add', 'whitelist-add'],
  };

  async execute(context: CommandContext, args?: AddToAllowlistParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.collectionAddress || !args?.addresses || args.addresses.length === 0) {
        throw new Error('Collection address and at least one address are required');
      }

      validateAddress(args.collectionAddress, 'Collection address');
      args.addresses.forEach((addr, i) => validateAddress(addr, `Address ${i + 1}`));

      logger.subsection('Allowlist Details');
      logger.info(`Collection: ${args.collectionAddress}`);
      logger.info(`Adding ${args.addresses.length} address(es):`);
      args.addresses.forEach((addr, i) => {
        logger.info(`  ${i + 1}. ${addr}`);
      });
      logger.space();

      logger.info('Adding to allowlist via SDK...');
      const result = await context.sdk.collection.addToAllowlist({
        collectionAddress: args.collectionAddress,
        addresses: args.addresses,
      });

      logger.success('Addresses Added to Allowlist!');
      logger.info(`Transaction: ${result.tx.hash}`);

      this.logSuccess(`${args.addresses.length} address(es) added to allowlist!`);
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
        message: 'Addresses to add (comma-separated):',
        filter: (input: string) => input.split(',').map(s => s.trim()),
        validate: (input: string) => {
          const addrs = input.split(',').map(s => s.trim());
          return addrs.every(a => ethers.isAddress(a)) || 'One or more invalid addresses';
        },
      },
    ];
  }
}
