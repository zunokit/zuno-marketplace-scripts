/**
 * Create ERC721 Collection Command
 */

import { BaseCommand } from '@core/Command.interface';
import {
  CommandMetadata,
  CommandContext,
  CreateERC721CollectionParams,
  PromptQuestion,
} from '@types';
import { logger } from '@utils';
import { DEFAULT_MINT_LIMIT_PER_WALLET, DEFAULT_ROYALTY_FEE_BPS } from '@/shared/constants';

export class CreateERC721Command extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'create-erc721',
    description: 'Create a new ERC721 NFT Collection',
    category: 'collections',
    aliases: ['erc721', 'create721'],
  };

  async execute(
    context: CommandContext,
    args?: Partial<CreateERC721CollectionParams>
  ): Promise<void> {
    this.logStart();

    try {
      const maxSupply = args?.maxSupply || 10000;
      const params: CreateERC721CollectionParams = {
        name: args?.name || 'Zuno ERC721 Collection',
        symbol: args?.symbol || 'ZUNO721',
        maxSupply,
        mintPrice: args?.mintPrice || '0.01',
        royaltyFee: args?.royaltyFee !== undefined ? args.royaltyFee : DEFAULT_ROYALTY_FEE_BPS,
        // IMPORTANT: mintLimitPerWallet must be > 0, otherwise minting is blocked
        mintLimitPerWallet: args?.mintLimitPerWallet ?? maxSupply,
        // Skip allowlist stage for public minting
        allowlistStageDuration: 0,
        tokenURI: args?.tokenURI || 'https://api.example.com/erc721/metadata/',
      };

      logger.subsection('Collection Parameters');
      logger.info(`Name: ${params.name}`);
      logger.info(`Symbol: ${params.symbol}`);
      logger.info(`Mint Price: ${params.mintPrice} ETH`);
      logger.info(`Royalty: ${(params.royaltyFee ?? 0) / 100}%`);
      logger.info(`Max Supply: ${params.maxSupply}`);
      logger.space();

      logger.info('Creating ERC721 collection via SDK...');
      const result = await context.sdk.collection.createERC721Collection(params);

      logger.success('ERC721 Collection created successfully!');
      logger.info(`Collection Address: ${result.address}`);
      logger.info(`Transaction Hash: ${result.tx.hash}`);

      this.logSuccess(`ERC721 collection deployed at: ${result.address}`);
    } catch (error) {
      const err = error as Error;
      this.logError(err);
      logger.error(`Failed to create ERC721 collection: ${err.message}`);
      throw error;
    }
  }

  async getPrompts(): Promise<PromptQuestion[]> {
    return [
      {
        type: 'input',
        name: 'name',
        message: 'Collection name:',
        default: 'Zuno ERC721 Collection',
      },
      { type: 'input', name: 'symbol', message: 'Collection symbol:', default: 'ZUNO721' },
      { type: 'input', name: 'mintPrice', message: 'Mint price (in ETH):', default: '0.01' },
      {
        type: 'number',
        name: 'royaltyFee',
        message: 'Royalty fee (basis points, 500 = 5%):',
        default: DEFAULT_ROYALTY_FEE_BPS,
      },
      { type: 'number', name: 'maxSupply', message: 'Max supply:', default: 10000 },
      {
        type: 'number',
        name: 'mintLimitPerWallet',
        message: 'Mint limit per wallet:',
        default: DEFAULT_MINT_LIMIT_PER_WALLET,
      },
    ];
  }
}
