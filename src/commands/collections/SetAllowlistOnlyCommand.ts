/**
 * Set Allowlist Only Command
 * Enables or disables allowlist-only minting mode for a collection
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { validateAddress, logger } from '@utils';

interface SetAllowlistOnlyParams {
  collectionAddress: string;
  enabled: boolean;
}

export class SetAllowlistOnlyCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'set-allowlist-only',
    description: 'Enable or disable allowlist-only minting mode',
    category: 'collections',
    aliases: ['allowlist-mode', 'whitelist-mode'],
  };

  async execute(context: CommandContext, args?: SetAllowlistOnlyParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.collectionAddress || args.enabled === undefined) {
        throw new Error('Collection address and enabled flag are required');
      }

      validateAddress(args.collectionAddress, 'Collection address');

      logger.subsection('Allowlist Mode');
      logger.info(`Collection: ${args.collectionAddress}`);
      logger.info(`Mode: ${args.enabled ? 'ALLOWLIST ONLY (restricted)' : 'PUBLIC (open to all)'}`);
      logger.space();

      logger.info('Setting allowlist mode via SDK...');
      // SDK expects: setAllowlistOnly(collectionAddress, enabled)
      const result = await context.sdk.collection.setAllowlistOnly(
        args.collectionAddress,
        args.enabled
      );

      logger.success('Allowlist Mode Updated!');
      logger.info(`Transaction: ${result.tx.hash}`);
      logger.info(args.enabled 
        ? 'Only allowlisted addresses can now mint' 
        : 'Anyone can now mint from this collection');

      this.logSuccess(`Allowlist-only mode ${args.enabled ? 'enabled' : 'disabled'}!`);
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
        type: 'confirm',
        name: 'enabled',
        message: 'Enable allowlist-only mode? (Yes = only allowlisted can mint):',
        default: true,
      },
    ];
  }
}
