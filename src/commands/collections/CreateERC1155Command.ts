/**
 * Create ERC1155 Collection Command
 */

import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext, CollectionParams } from '@types';
import { logger } from '@utils';

export class CreateERC1155Command extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'create-erc1155',
    description: 'Create a new ERC1155 NFT Collection',
    category: 'collections',
    aliases: ['erc1155', 'create1155'],
  };

  async execute(context: CommandContext, args?: Partial<CollectionParams>): Promise<void> {
    this.logStart();

    try {
      const params = {
        name: args?.name || 'Zuno ERC1155 Collection',
        symbol: args?.symbol || 'ZUNO1155',
        maxSupply: args?.maxSupply || 10000,
        mintPrice: args?.mintPrice || '0.01',
        royaltyFee: args?.royaltyFee || 500,
        mintLimitPerWallet: args?.mintLimitPerWallet || 1000,
        baseURI: args?.tokenURI || 'https://api.example.com/erc1155/metadata/{id}',
      };

      logger.subsection('Collection Parameters');
      logger.info(`Name: ${params.name}`);
      logger.info(`Symbol: ${params.symbol}`);
      logger.info(`Mint Price: ${params.mintPrice} ETH`);
      logger.info(`Royalty: ${params.royaltyFee / 100}%`);
      logger.info(`Max Supply: ${params.maxSupply}`);
      logger.space();

      logger.info('Creating ERC1155 collection via SDK...');
      const result = await context.sdk.collection.createERC1155Collection(params);

      logger.success('ERC1155 Collection created successfully!');
      logger.info(`Collection Address: ${result.address}`);
      logger.info(`Transaction Hash: ${result.tx.hash}`);

      this.logSuccess(`ERC1155 collection deployed at: ${result.address}`);
    } catch (error) {
      this.logError(error as Error);
      throw error;
    }
  }

  async getPrompts(): Promise<any[]> {
    return [
      { type: 'input', name: 'name', message: 'Collection name:', default: 'Zuno ERC1155 Collection' },
      { type: 'input', name: 'symbol', message: 'Collection symbol:', default: 'ZUNO1155' },
      { type: 'input', name: 'mintPrice', message: 'Mint price (in ETH):', default: '0.01' },
      { type: 'number', name: 'royaltyFee', message: 'Royalty fee (basis points, 500 = 5%):', default: 500 },
      { type: 'number', name: 'maxSupply', message: 'Max supply:', default: 10000 },
      { type: 'number', name: 'mintLimitPerWallet', message: 'Mint limit per wallet:', default: 1000 },
    ];
  }
}
