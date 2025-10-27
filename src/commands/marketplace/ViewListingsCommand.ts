/**
 * View Listings Command
 * View all active listings for the current user
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { logger } from '@utils';

export class ViewListingsCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'view-listings',
    description: 'View your active marketplace listings',
    category: 'marketplace',
    aliases: ['my-listings', 'listings'],
  };

  async execute(context: CommandContext): Promise<void> {
    this.logStart();

    try {
      const { provider } = context;

      logger.subsection('Your Active Listings');
      logger.info(`Wallet: ${provider.account}`);
      logger.space();

      let totalListings = 0;

      // Check ERC721 listings
      const erc721ABI = await context.abiProvider.getABI('ERC721NFTExchange');
      const erc721Exchange = new ethers.Contract(
        provider.addresses.erc721Exchange,
        erc721ABI,
        provider.provider
      );

      try {
        const erc721Listings = await erc721Exchange.getActiveListingsBySeller!(provider.account);

        if (erc721Listings.length > 0) {
          logger.subsection('ERC721 Listings');

          for (const listingId of erc721Listings) {
            const listing = await erc721Exchange.s_listings!(listingId);

            const expiresAt = new Date(
              (Number(listing.listingStart) + Number(listing.listingDuration)) * 1000
            );
            const timeLeft = Math.max(
              0,
              Math.floor((expiresAt.getTime() - Date.now()) / 1000 / 3600)
            );

            logger.info(`\nListing ID: ${listingId}`);
            logger.info(`  NFT: ${listing.contractAddress}`);
            logger.info(`  Token ID: ${listing.tokenId.toString()}`);
            logger.info(`  Price: ${ethers.formatEther(listing.price)} ETH`);
            logger.info(`  Expires in: ${timeLeft} hours`);

            totalListings++;
          }

          logger.space();
        }
      } catch (error) {
        logger.warning('Could not fetch ERC721 listings: ' + (error as Error).message);
        logger.debug('This may indicate you have no listings or there was an issue querying the exchange');
      }

      // Check ERC1155 listings
      const erc1155ABI = await context.abiProvider.getABI('ERC1155NFTExchange');
      const erc1155Exchange = new ethers.Contract(
        provider.addresses.erc1155Exchange,
        erc1155ABI,
        provider.provider
      );

      try {
        const erc1155Listings = await erc1155Exchange.getActiveListingsBySeller!(provider.account);

        if (erc1155Listings.length > 0) {
          logger.subsection('ERC1155 Listings');

          for (const listingId of erc1155Listings) {
            const listing = await erc1155Exchange.s_listings!(listingId);

            const expiresAt = new Date(
              (Number(listing.listingStart) + Number(listing.listingDuration)) * 1000
            );
            const timeLeft = Math.max(
              0,
              Math.floor((expiresAt.getTime() - Date.now()) / 1000 / 3600)
            );

            logger.info(`\nListing ID: ${listingId}`);
            logger.info(`  NFT: ${listing.contractAddress}`);
            logger.info(`  Token ID: ${listing.tokenId.toString()}`);
            logger.info(`  Amount: ${listing.amount.toString()}`);
            logger.info(`  Price: ${ethers.formatEther(listing.price)} ETH (per unit)`);
            logger.info(`  Expires in: ${timeLeft} hours`);

            totalListings++;
          }

          logger.space();
        }
      } catch (error) {
        logger.warning('Could not fetch ERC1155 listings: ' + (error as Error).message);
        logger.debug('This may indicate you have no listings or there was an issue querying the exchange');
      }

      if (totalListings === 0) {
        logger.info('You have no active listings');
        logger.info('Use "list-nft" command to list an NFT for sale');
      } else {
        logger.success(`Total Active Listings: ${totalListings}`);
      }

      this.logSuccess('Listing query complete');
    } catch (error) {
      this.logError(error as Error);
      throw error;
    }
  }

  async getPrompts(): Promise<any[]> {
    return [];
  }
}
