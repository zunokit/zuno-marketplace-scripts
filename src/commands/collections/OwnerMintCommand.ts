/**
 * Owner Mint Command
 * Owner-only minting that bypasses all restrictions except maxSupply
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { validateAddress, validatePositiveNumber, logger } from '@utils';

interface OwnerMintParams {
  collectionAddress: string;
  recipient?: string;
  amount: number;
}

export class OwnerMintCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'owner-mint',
    description: 'Owner-only minting (bypasses restrictions)',
    category: 'collections',
    aliases: ['owner-mint-nft'],
  };

  async execute(context: CommandContext, args?: OwnerMintParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.collectionAddress) {
        throw new Error('Collection address is required');
      }

      validateAddress(args.collectionAddress, 'Collection address');
      const amount = args.amount || 1;
      validatePositiveNumber(amount, 'Amount');

      const recipient = args.recipient || context.account;
      validateAddress(recipient, 'Recipient address');

      logger.subsection('Owner Mint Parameters');
      logger.info(`Collection: ${args.collectionAddress}`);
      logger.info(`Recipient: ${recipient}`);
      logger.info(`Amount: ${amount}`);
      logger.space();
      logger.info('Note: This bypasses mint price, allowlist, and limits (except maxSupply)');
      logger.space();

      logger.info('Minting via SDK...');
      const result = await context.sdk.collection.ownerMint(
        args.collectionAddress,
        recipient,
        amount
      );

      logger.success(`Owner minted ${amount} NFT(s)!`);
      logger.info(`Transaction: ${result.tx.hash}`);

      this.logSuccess(`Successfully owner-minted ${amount} NFT(s)!`);
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
        type: 'number',
        name: 'amount',
        message: 'Amount to mint:',
        default: 1,
        validate: (input: number) => input > 0 || 'Amount must be > 0',
      },
      {
        type: 'input',
        name: 'recipient',
        message: 'Recipient address (leave empty for yourself):',
        default: '',
        validate: (input: string) => {
          if (!input) return true;
          return ethers.isAddress(input) || 'Invalid address';
        },
      },
    ];
  }
}
