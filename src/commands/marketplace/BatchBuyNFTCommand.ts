/**
 * Batch Buy NFT Command
 * Purchases multiple NFTs from the marketplace in a single transaction
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { logger } from '@utils';

interface BatchBuyNFTParams {
  listingIds: string[];
}

export class BatchBuyNFTCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'batch-buy-nft',
    description: 'Batch buy multiple NFTs from marketplace (1 transaction)',
    category: 'marketplace',
    aliases: ['batch-buy', 'bbuy'],
  };

  async execute(context: CommandContext, args?: BatchBuyNFTParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.listingIds || args.listingIds.length === 0) {
        throw new Error('At least one listing ID is required');
      }

      // Convert listing IDs to hex format if needed
      const listingIdsHex = args.listingIds.map(id => {
        if (id.startsWith('0x')) return id;
        return '0x' + BigInt(id).toString(16).padStart(64, '0');
      });

      logger.subsection('Batch Purchase Details');
      logger.info(`Number of NFTs: ${args.listingIds.length}`);
      args.listingIds.forEach((id, i) => {
        logger.info(`  Listing ${i + 1}: ${id}`);
      });
      logger.space();

      // Calculate total price
      logger.info('Calculating total price...');
      let totalValue = 0n;
      for (const id of listingIdsHex) {
        const price = await context.sdk.exchange.getBuyerPrice(id);
        totalValue += ethers.parseEther(price);
      }
      logger.info(`Total price (with fees): ${ethers.formatEther(totalValue)} ETH`);
      logger.space();

      logger.info('Batch purchasing NFTs via SDK...');
      const result = await context.sdk.exchange.batchBuyNFT({
        listingIds: listingIdsHex,
        value: ethers.formatEther(totalValue),
      });

      logger.success('Batch Purchase Successful!');
      logger.info(`Transaction: ${result.tx.hash}`);

      this.logSuccess(`${args.listingIds.length} NFTs purchased in 1 transaction!`);
    } catch (error) {
      this.logError(error as Error);
      throw error;
    }
  }

  async getPrompts(): Promise<any[]> {
    return [
      {
        type: 'input',
        name: 'listingIds',
        message: 'Listing IDs (comma-separated):',
        filter: (input: string) => input.split(',').map(s => s.trim()),
        validate: (input: string) => input.trim().length > 0 || 'At least one listing ID required',
      },
    ];
  }
}
