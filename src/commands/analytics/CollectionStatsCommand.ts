/**
 * Collection Stats Command
 * Displays statistics for an NFT collection
 */

import { ethers } from 'ethers';
import { BaseCommand } from '../../core/Command.interface';
import { CommandMetadata, CommandContext } from '../../types';
import { validateAddress, logger } from '../../utils';

interface CollectionStatsParams {
  collectionAddress: string;
}

export class CollectionStatsCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'collection-stats',
    description: 'View statistics for an NFT collection',
    category: 'analytics',
    aliases: ['stats'],
  };

  async execute(context: CommandContext, args?: CollectionStatsParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.collectionAddress) {
        throw new Error('Collection address is required');
      }

      validateAddress(args.collectionAddress, 'Collection address');

      const { provider } = context;

      logger.subsection('Fetching Collection Statistics');
      logger.info(`Collection: ${args.collectionAddress}`);
      logger.space();

      // Create collection contract instance
      const collectionABI = [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function totalSupply() view returns (uint256)',
        'function owner() view returns (address)',
        'function getTotalMinted() view returns (uint256)',
        'function getMaxSupply() view returns (uint256)',
        'function getMintPrice() view returns (uint256)',
        'function balanceOf(address) view returns (uint256)',
      ];

      const collection = new ethers.Contract(args.collectionAddress, collectionABI, provider.provider);

      // Fetch basic info
      logger.subsection('Collection Info');

      try {
        const name = await collection.name!();
        const symbol = await collection.symbol!();
        logger.info(`Name: ${name}`);
        logger.info(`Symbol: ${symbol}`);
      } catch {
        logger.warning('Unable to fetch name/symbol');
      }

      try {
        const owner = await collection.owner!();
        logger.info(`Owner: ${owner}`);
      } catch {
        logger.warning('Unable to fetch owner');
      }

      logger.space();

      // Fetch supply info
      logger.subsection('Supply Statistics');

      try {
        const totalMinted = await collection.getTotalMinted!();
        const maxSupply = await collection.getMaxSupply!();
        const remaining = maxSupply - totalMinted;
        const percentMinted = Number((totalMinted * 10000n) / maxSupply) / 100;

        logger.info(`Total Minted: ${totalMinted}`);
        logger.info(`Max Supply: ${maxSupply}`);
        logger.info(`Remaining: ${remaining}`);
        logger.info(`Minted: ${percentMinted}%`);
      } catch (error) {
        try {
          const totalSupply = await collection.totalSupply!();
          logger.info(`Total Supply: ${totalSupply}`);
        } catch {
          logger.warning('Unable to fetch supply data');
        }
      }

      logger.space();

      // Fetch pricing info
      logger.subsection('Pricing Info');

      try {
        const mintPrice = await collection.getMintPrice!();
        logger.info(`Mint Price: ${ethers.formatEther(mintPrice)} ETH`);
      } catch {
        logger.warning('Unable to fetch mint price');
      }

      logger.space();

      // Check user's balance
      logger.subsection('Your Holdings');

      try {
        const balance = await collection.balanceOf!(provider.account);
        logger.info(`Your Balance: ${balance} NFTs`);

        if (balance > 0n) {
          try {
            const totalMinted = await collection.getTotalMinted!();
            const ownership = Number((balance * 10000n) / totalMinted) / 100;
            logger.info(`Your Ownership: ${ownership}% of minted supply`);
          } catch {
            // Ignore
          }
        }
      } catch {
        logger.warning('Unable to fetch your balance');
      }

      logger.space();

      // Additional marketplace stats would go here if available
      logger.info('💡 Tip: Use list-nft command to list your NFTs for sale');

      this.logSuccess('Collection statistics fetched successfully!');
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
        message: 'Collection contract address:',
        validate: (input: string) => ethers.isAddress(input) || 'Invalid address',
      },
    ];
  }
}
