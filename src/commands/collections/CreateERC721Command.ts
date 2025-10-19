/**
 * Create ERC721 Collection Command
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext, CollectionParams } from '@types';
import { formatCollectionParams, waitForTransaction } from '@/providers/ProviderContext';
import { logger } from '@utils';

export class CreateERC721Command extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'create-erc721',
    description: 'Create a new ERC721 NFT Collection',
    category: 'collections',
    aliases: ['erc721', 'create721'],
  };

  async execute(context: CommandContext, args?: Partial<CollectionParams>): Promise<void> {
    this.logStart();

    try {
      const { provider } = context;

      // Get factory address
      const factoryAddress = provider.addresses.erc721Factory;
      logger.info(`ERC721 Factory: ${factoryAddress}`);

      // Get factory ABI
      const factoryABI = await context.abiProvider.getABI('ERC721CollectionFactory');

      // Create factory contract
      const factory = new ethers.Contract(factoryAddress, factoryABI, provider.signer);

      // Prepare collection parameters
      const collectionParams = formatCollectionParams(
        {
          name: args?.name || 'Zuno ERC721 Collection',
          symbol: args?.symbol || 'ZUNO721',
          description: args?.description || 'A test ERC721 collection with full features',
          mintPrice: args?.mintPrice || '0.01',
          royaltyFee: args?.royaltyFee || 500,
          maxSupply: args?.maxSupply || 10000,
          mintLimitPerWallet: args?.mintLimitPerWallet || 1000,
          tokenURI: args?.tokenURI || 'https://api.example.com/erc721/metadata/',
          ...args,
        },
        provider.account
      );

      logger.subsection('Collection Parameters');
      logger.info(`Name: ${collectionParams.name}`);
      logger.info(`Symbol: ${collectionParams.symbol}`);
      logger.info(`Owner: ${collectionParams.owner}`);
      logger.info(`Description: ${collectionParams.description}`);
      logger.info(`Mint Price: ${ethers.formatEther(collectionParams.mintPrice)} ETH`);
      logger.info(`Royalty: ${collectionParams.royaltyFee / 100}%`);
      logger.info(`Max Supply: ${collectionParams.maxSupply}`);
      logger.space();

      // Create the collection
      logger.info('Creating ERC721 collection...');
      const tx = await factory.createERC721Collection!(collectionParams);
      const receipt = await waitForTransaction(tx, 'Create ERC721 Collection');

      // Get collection address from event
      let collectionAddress: string | null = null;
      for (const log of receipt.logs) {
        try {
          const parsed = factory.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
          if (parsed?.name === 'ERC721CollectionCreated') {
            collectionAddress = parsed.args[0];
            break;
          }
        } catch {
          // Not our event
        }
      }

      if (!collectionAddress) {
        throw new Error('Could not find collection address in transaction logs');
      }

      logger.success('ERC721 Collection created successfully!');
      logger.info(`Collection Address: ${collectionAddress}`);

      // Verify the collection
      await this.verifyCollection(context, collectionAddress);

      this.logSuccess(`ERC721 collection deployed at: ${collectionAddress}`);
    } catch (error) {
      this.logError(error as Error);
      throw error;
    }
  }

  private async verifyCollection(context: CommandContext, collectionAddress: string): Promise<void> {
    logger.subsection('Verifying Collection');

    try {
      const collectionABI = await context.abiProvider.getABI('ERC721Collection');
      const collection = new ethers.Contract(
        collectionAddress,
        collectionABI,
        context.provider.provider
      );

      const name = await collection.name!();
      const symbol = await collection.symbol!();
      const owner = await collection.owner!();

      logger.info(`Name: ${name || '⚠️ Empty'}`);
      logger.info(`Symbol: ${symbol || '⚠️ Empty'}`);
      logger.info(`Owner: ${owner}`);

      if (!name || !symbol) {
        logger.warning('Collection name or symbol is empty!');
        logger.warning('This might be a bug in the smart contract initialization.');
      }
    } catch (error) {
      logger.error(`Error verifying collection: ${(error as Error).message}`);
    }
  }

  async getPrompts(): Promise<any[]> {
    return [
      {
        type: 'input',
        name: 'name',
        message: 'Collection name:',
        default: 'Zuno ERC721 Collection',
      },
      {
        type: 'input',
        name: 'symbol',
        message: 'Collection symbol:',
        default: 'ZUNO721',
      },
      {
        type: 'input',
        name: 'description',
        message: 'Collection description:',
        default: 'A test ERC721 collection',
      },
      {
        type: 'input',
        name: 'mintPrice',
        message: 'Mint price (in ETH):',
        default: '0.01',
      },
      {
        type: 'number',
        name: 'royaltyFee',
        message: 'Royalty fee (in basis points, e.g., 500 = 5%):',
        default: 500,
      },
      {
        type: 'number',
        name: 'maxSupply',
        message: 'Max supply:',
        default: 10000,
      },
      {
        type: 'number',
        name: 'mintLimitPerWallet',
        message: 'Mint limit per wallet:',
        default: 1000,
      },
    ];
  }
}
