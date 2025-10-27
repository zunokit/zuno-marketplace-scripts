/**
 * Cancel Listing Command
 * Cancels an active NFT listing on the marketplace
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { waitForTransaction } from '@/providers/ProviderContext';
import { logger } from '@utils';

interface CancelListingParams {
  listingId?: string;
  nftAddress?: string;
  tokenId?: number | string;
}

export class CancelListingCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'cancel-listing',
    description: 'Cancel an active NFT listing',
    category: 'marketplace',
    aliases: ['cancel'],
  };

  async execute(context: CommandContext, args?: CancelListingParams): Promise<void> {
    this.logStart();

    try {
      const { provider } = context;
      let listingId = args?.listingId;

      // If user provides NFT address + tokenId, find their listing
      if (!listingId && args?.nftAddress && args?.tokenId) {
        logger.info('Finding your listing...');

        // Try ERC721 exchange first
        const erc721ABI = await context.abiProvider.getABI('ERC721NFTExchange');
        const erc721Exchange = new ethers.Contract(
          provider.addresses.erc721Exchange,
          erc721ABI,
          provider.provider
        );

        try {
          const [isListed, foundListingId, seller] = await erc721Exchange.isNFTListed!(
            args.nftAddress,
            args.tokenId
          );

          if (isListed && seller.toLowerCase() === provider.account.toLowerCase()) {
            listingId = foundListingId;
            logger.success('Found your ERC721 listing');
          }
        } catch (error) {
          logger.debug('Not found in ERC721 exchange, trying ERC1155...');
        }

        // If not found in ERC721, try ERC1155
        if (!listingId) {
          try {
            const erc1155ABI = await context.abiProvider.getABI('ERC1155NFTExchange');
            const erc1155Exchange = new ethers.Contract(
              provider.addresses.erc1155Exchange,
              erc1155ABI,
              provider.provider
            );

            const [isListed, foundListingId, seller] = await erc1155Exchange.isNFTListed!(
              args.nftAddress,
              args.tokenId
            );

            if (isListed && seller.toLowerCase() === provider.account.toLowerCase()) {
              listingId = foundListingId;
              logger.success('Found your ERC1155 listing');
            } else if (isListed) {
              throw new Error('This NFT is listed but not by you. Current seller: ' + seller);
            } else {
              throw new Error('No active listing found for this NFT');
            }
          } catch (error) {
            if (error instanceof Error && error.message.includes('listed but not by you')) {
              throw error;
            }
            throw new Error('No active listing found for this NFT owned by you');
          }
        }
      }

      if (!listingId) {
        throw new Error('Please provide either listingId or (nftAddress + tokenId)');
      }

      logger.info(`Listing ID: ${listingId}`);
      logger.space();

      // Try to cancel on ERC721 exchange first
      let exchangeABI = await context.abiProvider.getABI('ERC721NFTExchange');
      let exchange = new ethers.Contract(
        provider.addresses.erc721Exchange,
        exchangeABI,
        provider.signer
      );

      try {
        const listing = await exchange.s_listings!(listingId);

        if (listing.contractAddress === ethers.ZeroAddress) {
          // Not in ERC721, try ERC1155
          logger.debug('Listing not in ERC721 exchange, trying ERC1155...');
          exchangeABI = await context.abiProvider.getABI('ERC1155NFTExchange');
          exchange = new ethers.Contract(
            provider.addresses.erc1155Exchange,
            exchangeABI,
            provider.signer
          );

          const listing1155 = await exchange.s_listings!(listingId);
          if (listing1155.contractAddress === ethers.ZeroAddress) {
            throw new Error('Listing not found in either ERC721 or ERC1155 exchange');
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          throw error;
        }
        logger.debug('Error fetching listing details: ' + (error as Error).message);
        // Continue with cancellation attempt
      }

      logger.info('Cancelling listing...');
      const tx = await exchange.cancelListing!(listingId);
      await waitForTransaction(tx, 'Cancel Listing');

      logger.success('Listing Cancelled Successfully!');
      logger.info('Your NFT is now unlisted and can be relisted or transferred');

      this.logSuccess('Listing cancelled successfully!');
    } catch (error) {
      this.logError(error as Error);
      throw error;
    }
  }

  async getPrompts(): Promise<any[]> {
    return [
      {
        type: 'input',
        name: 'listingId',
        message: 'Listing ID (or leave empty to search by NFT):',
        default: '',
      },
      {
        type: 'input',
        name: 'nftAddress',
        message: 'NFT contract address (if no listing ID):',
        when: (answers: any) => !answers.listingId,
      },
      {
        type: 'input',
        name: 'tokenId',
        message: 'Token ID (if no listing ID):',
        when: (answers: any) => !answers.listingId,
      },
    ];
  }
}
