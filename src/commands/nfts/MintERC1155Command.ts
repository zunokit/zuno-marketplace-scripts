/**
 * Mint ERC1155 NFT Command
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext, MintParams } from '@types';
import { validateAddress, validatePositiveNumber, logger } from '@utils';

export class MintERC1155Command extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'mint-erc1155',
    description: 'Mint ERC1155 NFTs',
    category: 'nfts',
    aliases: ['mint1155'],
  };

  async execute(context: CommandContext, args?: MintParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.collectionAddress) {
        throw new Error('Collection address is required');
      }

      validateAddress(args.collectionAddress, 'Collection address');
      const amount = args.amount || 1;
      validatePositiveNumber(amount, 'Amount');

      const recipient = args.recipient || context.account;

      logger.subsection('Minting Parameters');
      logger.info(`Collection: ${args.collectionAddress}`);
      logger.info(`Recipient: ${recipient}`);
      logger.info(`Amount: ${amount}`);
      logger.space();

      logger.info('Minting via SDK...');

      const result = await context.sdk.collection.mintERC1155({
        collectionAddress: args.collectionAddress,
        recipient,
        amount,
      });
      logger.success(`Minted ${amount} token(s)!`);
      logger.info(`Transaction: ${result.tx.hash}`);

      this.logSuccess(`Successfully minted ${amount} token(s)!`);
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
      },
      {
        type: 'input',
        name: 'recipient',
        message: 'Recipient address (leave empty for yourself):',
        default: '',
      },
    ];
  }
}
