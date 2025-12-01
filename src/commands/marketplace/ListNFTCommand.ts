/**
 * List NFT Command
 * Lists an NFT for sale on the marketplace
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext, PromptQuestion } from '@types';
import { validateAddress, validatePositiveNumber, logger } from '@utils';
import { daysToSeconds, DEFAULT_LISTING_DURATION_DAYS } from '@/shared/constants';

interface ListNFTParams {
  nftAddress: string;
  tokenId: number | string;
  price: string;
  duration: number;
  amount?: number;
}

export class ListNFTCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'list-nft',
    description: 'List NFT for sale on marketplace',
    category: 'marketplace',
    aliases: ['list'],
  };

  async execute(context: CommandContext, args?: ListNFTParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.nftAddress || !args?.tokenId || !args?.price || !args?.duration) {
        throw new Error('Missing required parameters: nftAddress, tokenId, price, duration');
      }

      validateAddress(args.nftAddress, 'NFT address');
      validatePositiveNumber(Number(args.tokenId), 'Token ID');
      validatePositiveNumber(Number(args.price), 'Price');
      validatePositiveNumber(args.duration, 'Duration');

      logger.subsection('Listing Details');
      logger.info(`NFT Contract: ${args.nftAddress}`);
      logger.info(`Token ID: ${args.tokenId}`);
      logger.info(`Price: ${args.price} ETH`);
      logger.info(`Duration: ${args.duration} days`);
      logger.space();

      logger.info('Listing NFT via SDK...');
      const result = await context.sdk.exchange.listNFT({
        collectionAddress: args.nftAddress,
        tokenId: String(args.tokenId),
        price: args.price,
        duration: daysToSeconds(args.duration),
      });

      logger.success('NFT Listed Successfully!');
      logger.info(`Listing ID: ${result.listingId}`);
      // Convert to hex for display (needed for buy/cancel operations)
      const listingIdHex = result.listingId.startsWith('0x')
        ? result.listingId
        : '0x' + BigInt(result.listingId).toString(16).padStart(64, '0');
      logger.info(`Listing ID (hex): ${listingIdHex}`);
      logger.info(`Transaction: ${result.tx.hash}`);

      const expirationDate = new Date(Date.now() + daysToSeconds(args.duration) * 1000);
      logger.info(`Expires: ${expirationDate.toLocaleString()}`);

      this.logSuccess('NFT listed successfully on marketplace!');
    } catch (error) {
      const err = error as Error;
      this.logError(err);
      logger.error(`Failed to list NFT: ${err.message}`);
      throw error;
    }
  }

  async getPrompts(): Promise<PromptQuestion[]> {
    return [
      {
        type: 'input',
        name: 'nftAddress',
        message: 'NFT contract address:',
        validate: (input: unknown) => {
          const addr = String(input);
          return ethers.isAddress(addr) || 'Invalid address';
        },
      },
      {
        type: 'input',
        name: 'tokenId',
        message: 'Token ID:',
        validate: (input: unknown) => !isNaN(Number(input)) || 'Invalid token ID',
      },
      {
        type: 'input',
        name: 'price',
        message: 'Listing price (in ETH):',
        validate: (input: unknown) =>
          (!isNaN(Number(input)) && Number(input) > 0) || 'Invalid price',
      },
      {
        type: 'number',
        name: 'duration',
        message: 'Listing duration (in days):',
        default: DEFAULT_LISTING_DURATION_DAYS,
      },
      {
        type: 'number',
        name: 'amount',
        message: 'Amount to list (for ERC1155):',
        default: 1,
      },
    ];
  }
}
