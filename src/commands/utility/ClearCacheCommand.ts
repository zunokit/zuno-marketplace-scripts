/**
 * Clear Cache Command
 * Clears SDK caches (ABIs, QueryClient, approval cache)
 */

import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { logger } from '@utils';

interface ClearCacheParams {
  type?: 'all' | 'abis' | 'approvals' | 'queries';
}

export class ClearCacheCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'clear-cache',
    description: 'Clear SDK caches',
    category: 'utility',
    aliases: ['cache-clear'],
  };

  async execute(context: CommandContext, args?: ClearCacheParams): Promise<void> {
    this.logStart();

    try {
      const type = args?.type || 'all';

      logger.info(`Clearing ${type} cache...`);
      logger.space();

      switch (type) {
        case 'abis':
          await context.sdk.contractRegistry.clearCache();
          logger.success('ABI cache cleared!');
          break;
        case 'approvals':
          context.sdk.exchange.clearApprovalCache();
          context.sdk.auction.clearApprovalCache();
          logger.success('Approval caches cleared!');
          break;
        case 'queries':
          context.sdk.getQueryClient().clear();
          logger.success('Query client cache cleared!');
          break;
        case 'all':
        default:
          await context.sdk.clearCache();
          logger.success('All SDK caches cleared!');
          break;
      }

      this.logSuccess('Cache cleared successfully!');
    } catch (error) {
      this.logError(error as Error);
      throw error;
    }
  }

  async getPrompts(): Promise<any[]> {
    return [
      {
        type: 'list',
        name: 'type',
        message: 'Select cache type to clear:',
        choices: [
          { name: 'All caches', value: 'all' },
          { name: 'ABI cache only', value: 'abis' },
          { name: 'Approval cache only', value: 'approvals' },
          { name: 'Query cache only', value: 'queries' },
        ],
        default: 'all',
      },
    ];
  }
}
