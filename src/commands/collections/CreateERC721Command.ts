/**
 * Create ERC721 Collection Command
 */

import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext, CollectionParams } from '@types';
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
      const maxSupply = args?.maxSupply || 10000;
      const params = {
        name: args?.name || 'Zuno ERC721 Collection',
        symbol: args?.symbol || 'ZUNO721',
        maxSupply,
        mintPrice: args?.mintPrice || '0.01',
        royaltyFee: args?.royaltyFee || 500,
        // IMPORTANT: mintLimitPerWallet must be > 0, otherwise minting is blocked
        mintLimitPerWallet: args?.mintLimitPerWallet || maxSupply,
        // Skip allowlist stage for public minting
        allowlistStageDuration: 0,
        tokenURI: args?.tokenURI || 'https://api.example.com/erc721/metadata/',
      };

      logger.subsection('Collection Parameters');
      logger.info(`Name: ${params.name}`);
      logger.info(`Symbol: ${params.symbol}`);
      logger.info(`Mint Price: ${params.mintPrice} ETH`);
      logger.info(`Royalty: ${params.royaltyFee / 100}%`);
      logger.info(`Max Supply: ${params.maxSupply}`);
      logger.space();

      logger.info('Creating ERC721 collection via SDK...');
      const result = await context.sdk.collection.createERC721Collection(params);

      logger.success('ERC721 Collection created successfully!');
      logger.info(`Collection Address: ${result.address}`);
      logger.info(`Transaction Hash: ${result.tx.hash}`);

      this.logSuccess(`ERC721 collection deployed at: ${result.address}`);
    } catch (error) {
      this.logError(error as Error);
      throw error;
    }
  }

  async getPrompts(): Promise<any[]> {
    return [
      { type: 'input', name: 'name', message: 'Collection name:', default: 'Zuno ERC721 Collection' },
      { type: 'input', name: 'symbol', message: 'Collection symbol:', default: 'ZUNO721' },
      { type: 'input', name: 'mintPrice', message: 'Mint price (in ETH):', default: '0.01' },
      { type: 'number', name: 'royaltyFee', message: 'Royalty fee (basis points, 500 = 5%):', default: 500 },
      { type: 'number', name: 'maxSupply', message: 'Max supply:', default: 10000 },
      { type: 'number', name: 'mintLimitPerWallet', message: 'Mint limit per wallet:', default: 1000 },
    ];
  }
}
