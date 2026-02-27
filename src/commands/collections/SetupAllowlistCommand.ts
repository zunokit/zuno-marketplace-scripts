/**
 * Setup Allowlist Command
 * Combines adding addresses and enabling allowlist mode in one transaction
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext, PromptQuestion } from '@types';
import { validateAddress, logger } from '@utils';

interface SetupAllowlistParams {
  collectionAddress: string;
  addresses: string[];
  enableAllowlistOnly: boolean;
}

export class SetupAllowlistCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'setup-allowlist',
    description: 'Setup allowlist (add addresses + enable mode in one tx)',
    category: 'collections',
    aliases: ['configure-allowlist'],
  };

  async execute(context: CommandContext, args?: SetupAllowlistParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.collectionAddress || !args?.addresses || args.addresses.length === 0) {
        throw new Error('Collection address and at least one address are required');
      }

      validateAddress(args.collectionAddress, 'Collection address');
      args.addresses.forEach((addr, i) => validateAddress(addr, `Address ${i + 1}`));

      logger.subsection('Allowlist Setup');
      logger.info(`Collection: ${args.collectionAddress}`);
      logger.info(`Adding ${args.addresses.length} address(es):`);
      args.addresses.forEach((addr, i) => {
        logger.info(`  ${i + 1}. ${addr}`);
      });
      logger.info(`Enable Allowlist-Only: ${args.enableAllowlistOnly ? 'Yes' : 'No'}`);
      logger.space();

      logger.info('Setting up allowlist via SDK...');
      const result = await context.sdk.collection.setupAllowlist(
        args.collectionAddress,
        args.addresses,
        args.enableAllowlistOnly
      );

      logger.success('Allowlist Setup Complete!');
      logger.info(`Transaction: ${result.tx.hash}`);
      logger.info(`${args.addresses.length} address(es) added to allowlist`);
      if (args.enableAllowlistOnly) {
        logger.info('Allowlist-only mode is now ENABLED');
      }

      this.logSuccess('Allowlist setup successfully!');
    } catch (error) {
      this.logError(error as Error);
      throw error;
    }
  }

  async getPrompts(): Promise<PromptQuestion[]> {
    return [
      {
        type: 'input',
        name: 'collectionAddress',
        message: 'Collection address:',
        validate: (input: unknown) => ethers.isAddress(String(input)) || 'Invalid address',
      },
      {
        type: 'input',
        name: 'addresses',
        message: 'Addresses to add (comma-separated):',
        filter: (input: unknown) => String(input).split(',').map(s => s.trim()),
        validate: (input: unknown) => {
          const addrs = String(input).split(',').map(s => s.trim());
          return addrs.every((a: string) => ethers.isAddress(a)) || 'One or more invalid addresses';
        },
      },
      {
        type: 'confirm',
        name: 'enableAllowlistOnly',
        message: 'Enable allowlist-only mode?',
        default: true,
      },
    ];
  }
}
