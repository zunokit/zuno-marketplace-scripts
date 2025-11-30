/**
 * Mint ERC721 NFT Command
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { validateAddress, logger } from '@utils';

interface MintERC721Params {
  collectionAddress: string;
  recipient?: string;
  mintPrice?: string;
}

export class MintERC721Command extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'mint-erc721',
    description: 'Mint ERC721 NFTs',
    category: 'nfts',
    aliases: ['mint721'],
  };

  async execute(context: CommandContext, args?: MintERC721Params): Promise<void> {
    this.logStart();

    try {
      if (!args?.collectionAddress) {
        throw new Error('Collection address is required');
      }

      validateAddress(args.collectionAddress, 'Collection address');
      const recipient = args.recipient || context.account;
      const mintPrice = args.mintPrice || '0';

      logger.subsection('Minting Parameters');
      logger.info(`Collection: ${args.collectionAddress}`);
      logger.info(`Recipient: ${recipient}`);
      if (mintPrice !== '0') {
        logger.info(`Mint Price: ${mintPrice} ETH`);
      }
      logger.space();

      logger.info('Minting via SDK...');

      // Pass value in wei for paid mints
      const value = mintPrice !== '0' ? ethers.parseEther(mintPrice).toString() : undefined;
      
      const result = await context.sdk.collection.mintERC721({
        collectionAddress: args.collectionAddress,
        recipient,
        value,
      });
      logger.success('Minted 1 NFT!');
      logger.info(`Token ID: ${result.tokenId}`);
      logger.info(`Transaction: ${result.tx.hash}`);

      this.logSuccess('Successfully minted NFT!');
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
        name: 'mintPrice',
        message: 'Mint price in ETH (0 for free mint):',
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
