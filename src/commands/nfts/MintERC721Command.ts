/**
 * Mint ERC721 NFT Command
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext, MintParams } from '@types';
import { validateAddress, validatePositiveNumber, logger } from '@utils';

export class MintERC721Command extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'mint-erc721',
    description: 'Mint ERC721 NFTs',
    category: 'nfts',
    aliases: ['mint721'],
  };

  async execute(context: CommandContext, args?: MintParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.collectionAddress) {
        throw new Error('Collection address is required');
      }

      validateAddress(args.collectionAddress, 'Collection address');
      const quantity = args.quantity || 1;
      validatePositiveNumber(quantity, 'Quantity');

      const recipient = args.recipient || context.account;

      logger.subsection('Minting Parameters');
      logger.info(`Collection: ${args.collectionAddress}`);
      logger.info(`Recipient: ${recipient}`);
      logger.info(`Quantity: ${quantity}`);
      logger.space();

      logger.info('Minting via SDK...');
      
      const result = await context.sdk.collection.mintERC721({
        collectionAddress: args.collectionAddress,
        recipient,
      });
      logger.success(`Minted ${quantity} NFT(s)!`);
      logger.info(`Token ID: ${result.tokenId}`);
      logger.info(`Transaction: ${result.tx.hash}`);

      this.logSuccess(`Successfully minted ${quantity} NFT(s)!`);
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
        name: 'quantity',
        message: 'Quantity to mint:',
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
