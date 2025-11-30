/**
 * Batch Mint ERC721 NFT Command
 * Mints multiple ERC721 NFTs in a single transaction
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { validateAddress, validatePositiveNumber, logger } from '@utils';

interface BatchMintERC721Params {
  collectionAddress: string;
  recipient?: string;
  quantity: number;
  mintPrice?: string;
}

export class BatchMintERC721Command extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'batch-mint-erc721',
    description: 'Batch mint multiple ERC721 NFTs (1 transaction)',
    category: 'nfts',
    aliases: ['batch-mint721', 'bmint721'],
  };

  async execute(context: CommandContext, args?: BatchMintERC721Params): Promise<void> {
    this.logStart();

    try {
      if (!args?.collectionAddress) {
        throw new Error('Collection address is required');
      }

      validateAddress(args.collectionAddress, 'Collection address');
      const quantity = args.quantity || 1;
      validatePositiveNumber(quantity, 'Quantity');

      const recipient = args.recipient || context.account;
      const mintPrice = args.mintPrice || '0';
      const totalValue = mintPrice !== '0' 
        ? ethers.parseEther(mintPrice) * BigInt(quantity)
        : 0n;

      logger.subsection('Batch Minting Parameters');
      logger.info(`Collection: ${args.collectionAddress}`);
      logger.info(`Recipient: ${recipient}`);
      logger.info(`Quantity: ${quantity}`);
      if (mintPrice !== '0') {
        logger.info(`Mint Price per NFT: ${mintPrice} ETH`);
        logger.info(`Total Value: ${ethers.formatEther(totalValue)} ETH`);
      }
      logger.space();

      logger.info('Batch minting via SDK...');

      const result = await context.sdk.collection.batchMintERC721({
        collectionAddress: args.collectionAddress,
        recipient,
        quantity,
        value: totalValue.toString(),
      });

      logger.success(`Batch minted ${quantity} NFT(s)!`);
      logger.info(`Token IDs: ${result.tokenIds.join(', ')}`);
      logger.info(`Transaction: ${result.tx.hash}`);

      this.logSuccess(`Successfully batch minted ${quantity} ERC721 NFT(s)!`);
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
        validate: (input: number) => input > 0 || 'Quantity must be > 0',
      },
      {
        type: 'input',
        name: 'mintPrice',
        message: 'Mint price per NFT in ETH (0 for free mint):',
        default: '0',
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
