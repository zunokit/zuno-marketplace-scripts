/**
 * Batch Mint ERC1155 NFT Command
 * Mints multiple ERC1155 token types in a single transaction
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { validateAddress, validatePositiveNumber, logger } from '@utils';

interface BatchMintERC1155Params {
  collectionAddress: string;
  recipient?: string;
  tokenIds: string[];
  amounts: number[];
  mintPrice?: string;
}

export class BatchMintERC1155Command extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'batch-mint-erc1155',
    description: 'Batch mint multiple ERC1155 token types (1 transaction)',
    category: 'nfts',
    aliases: ['batch-mint1155', 'bmint1155'],
  };

  async execute(context: CommandContext, args?: BatchMintERC1155Params): Promise<void> {
    this.logStart();

    try {
      if (!args?.collectionAddress) {
        throw new Error('Collection address is required');
      }

      if (!args.tokenIds || !args.amounts) {
        throw new Error('Token IDs and amounts are required');
      }

      if (args.tokenIds.length !== args.amounts.length) {
        throw new Error('tokenIds and amounts arrays must have the same length');
      }

      validateAddress(args.collectionAddress, 'Collection address');
      args.tokenIds.forEach((id, i) => validatePositiveNumber(Number(id), `Token ID ${i + 1}`));
      args.amounts.forEach((amt, i) => validatePositiveNumber(amt, `Amount ${i + 1}`));

      const recipient = args.recipient || context.account;
      const mintPrice = args.mintPrice || '0';
      const totalAmount = args.amounts.reduce((sum, amt) => sum + amt, 0);
      const totalValue = mintPrice !== '0' 
        ? ethers.parseEther(mintPrice) * BigInt(totalAmount)
        : 0n;

      logger.subsection('Batch Minting Parameters');
      logger.info(`Collection: ${args.collectionAddress}`);
      logger.info(`Recipient: ${recipient}`);
      logger.info(`Token Types: ${args.tokenIds.length}`);
      args.tokenIds.forEach((id, i) => {
        logger.info(`  Token #${id}: ${args.amounts[i]} copies`);
      });
      logger.info(`Total NFTs: ${totalAmount}`);
      if (mintPrice !== '0') {
        logger.info(`Mint Price per NFT: ${mintPrice} ETH`);
        logger.info(`Total Value: ${ethers.formatEther(totalValue)} ETH`);
      }
      logger.space();

      logger.info('Batch minting via SDK...');

      const result = await context.sdk.collection.batchMintERC1155({
        collectionAddress: args.collectionAddress,
        recipient,
        tokenIds: args.tokenIds,
        amounts: args.amounts,
        value: totalValue.toString(),
      });

      logger.success(`Batch minted ${totalAmount} token(s) across ${args.tokenIds.length} type(s)!`);
      logger.info(`Transaction: ${result.tx.hash}`);

      this.logSuccess(`Successfully batch minted ERC1155 tokens!`);
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
        name: 'tokenIds',
        message: 'Token IDs (comma-separated, e.g., 1,2,3):',
        filter: (input: string) => input.split(',').map(s => s.trim()),
        validate: (input: string) => {
          const ids = input.split(',').map(s => s.trim());
          return ids.every(id => !isNaN(Number(id))) || 'Invalid token IDs';
        },
      },
      {
        type: 'input',
        name: 'amounts',
        message: 'Amounts (comma-separated, e.g., 10,5,20):',
        filter: (input: string) => input.split(',').map(s => parseInt(s.trim())),
        validate: (input: string) => {
          const amounts = input.split(',').map(s => parseInt(s.trim()));
          return amounts.every(a => !isNaN(a) && a > 0) || 'Invalid amounts';
        },
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
