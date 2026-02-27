/**
 * Get Owned Tokens Command
 * Retrieves tokens owned by a user from a collection
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { validateAddress, logger } from '@utils';

interface GetOwnedTokensParams {
  collectionAddress: string;
  userAddress?: string;
}

export class GetOwnedTokensCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'get-owned-tokens',
    description: 'Get tokens owned by a user from a collection',
    category: 'collections',
    aliases: ['my-tokens', 'owned-tokens'],
  };

  async execute(context: CommandContext, args?: GetOwnedTokensParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.collectionAddress) {
        throw new Error('Collection address is required');
      }

      validateAddress(args.collectionAddress, 'Collection address');
      const userAddress = args?.userAddress || context.account;
      validateAddress(userAddress, 'User address');

      logger.info(`Fetching tokens for user: ${userAddress}`);
      logger.info(`Collection: ${args.collectionAddress}`);
      logger.space();

      const tokens = await context.sdk.collection.getUserOwnedTokens(
        args.collectionAddress,
        userAddress
      );

      if (tokens.length === 0) {
        logger.info('No tokens found for this user in this collection.');
        return;
      }

      logger.subsection(`Found ${tokens.length} Token Type(s)`);

      tokens.forEach((token, index) => {
        logger.info(`\n[${index + 1}] Token ID: ${token.tokenId}`);
        logger.info(`    Amount: ${token.amount}`);
      });

      this.logSuccess(`${tokens.length} token(s) retrieved!`);
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
        name: 'userAddress',
        message: 'User address (leave empty for your address):',
        default: '',
        validate: (input: string) => {
          if (!input) return true;
          return ethers.isAddress(input) || 'Invalid address';
        },
      },
    ];
  }
}
