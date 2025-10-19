/**
 * Buy NFT Command
 * Purchases an NFT from the marketplace
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { waitForTransaction } from '@/providers/ProviderContext';
import { logger } from '@utils';

interface BuyNFTParams {
  listingId?: string;
  nftAddress?: string;
  tokenId?: number | string;
}

export class BuyNFTCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'buy-nft',
    description: 'Buy NFT from marketplace',
    category: 'marketplace',
    aliases: ['buy'],
  };

  async execute(context: CommandContext, args?: BuyNFTParams): Promise<void> {
    this.logStart();

    try {
      const { provider } = context;
      let listingId = args?.listingId;
      let exchangeAddress: string;

      // If listing ID not provided, try to find it from NFT details
      if (!listingId && args?.nftAddress && args?.tokenId) {
        logger.info('Finding listing for NFT...');

        // Minimal interface to detect NFT standard
        const nftInterface = new ethers.Interface(['function supportsInterface(bytes4) view returns (bool)']);
        const nftContract = new ethers.Contract(args.nftAddress, nftInterface, provider.provider);

        let isERC721 = false;
        try {
          isERC721 = await nftContract.supportsInterface!('0x80ac58cd');
        } catch {
          isERC721 = true;
        }

        exchangeAddress = isERC721
          ? provider.addresses.erc721Exchange
          : provider.addresses.erc1155Exchange;

        // Get exchange ABI from API
        const exchangeABIName = isERC721 ? 'ERC721NFTExchange' : 'ERC1155NFTExchange';
        const tempExchangeABI = await context.abiProvider.getABI(exchangeABIName);
        const exchange = new ethers.Contract(exchangeAddress, tempExchangeABI, provider.provider);

        listingId = await exchange.getListingByNFT!(args.nftAddress, args.tokenId);

        if (listingId === '0x0000000000000000000000000000000000000000000000000000000000000000') {
          throw new Error('No active listing found for this NFT');
        }
      }

      if (!listingId) {
        throw new Error('Please provide either listingId or (nftAddress + tokenId)');
      }

      logger.info(`Listing ID: ${listingId}`);
      logger.space();

      // Try to get listing from ERC721 exchange first
      exchangeAddress = provider.addresses.erc721Exchange;

      // Get ERC721 exchange ABI from API
      let exchangeABI = await context.abiProvider.getABI('ERC721NFTExchange');
      let exchange = new ethers.Contract(exchangeAddress, exchangeABI, provider.signer);
      let listing: any;

      try {
        listing = await exchange.getListing!(listingId);
      } catch {
        // Try ERC1155 exchange
        exchangeAddress = provider.addresses.erc1155Exchange;
        exchangeABI = await context.abiProvider.getABI('ERC1155NFTExchange');
        exchange = new ethers.Contract(exchangeAddress, exchangeABI, provider.signer);
        listing = await exchange.getListing!(listingId);
      }

      // Validate listing
      if (!listing.isActive) {
        throw new Error('Listing is not active');
      }

      const now = Math.floor(Date.now() / 1000);
      if (listing.expirationTime < now) {
        throw new Error('Listing has expired');
      }

      if (listing.seller.toLowerCase() === provider.account.toLowerCase()) {
        throw new Error('You cannot buy your own NFT');
      }

      // Display listing details
      logger.subsection('Listing Details');
      logger.info(`Seller: ${listing.seller}`);
      logger.info(`NFT Contract: ${listing.contractAddress}`);
      logger.info(`Token ID: ${listing.tokenId}`);
      if (listing.amount > 1) {
        logger.info(`Amount: ${listing.amount}`);
      }
      logger.info(`Price: ${ethers.formatEther(listing.price)} ETH`);

      const expirationDate = new Date(Number(listing.expirationTime) * 1000);
      logger.info(`Expires: ${expirationDate.toLocaleString()}`);
      logger.space();

      // Calculate total price (including fees)
      const totalPrice = listing.price;
      logger.info(`Total Price: ${ethers.formatEther(totalPrice)} ETH`);

      // Check buyer balance
      const balance = await provider.provider.getBalance(provider.account);
      if (balance < totalPrice) {
        throw new Error(
          `Insufficient balance. You have ${ethers.formatEther(balance)} ETH but need ${ethers.formatEther(totalPrice)} ETH`
        );
      }

      logger.space();

      // Execute purchase
      logger.info('Purchasing NFT...');
      const tx = await exchange.buyNFT!(listingId, { value: totalPrice });
      await waitForTransaction(tx, 'Buy NFT');

      logger.success('NFT Purchased Successfully!');
      logger.info(`NFT Contract: ${listing.contractAddress}`);
      logger.info(`Token ID: ${listing.tokenId}`);
      if (listing.amount > 1) {
        logger.info(`Amount: ${listing.amount}`);
      }
      logger.info(`Total Paid: ${ethers.formatEther(totalPrice)} ETH`);

      this.logSuccess(`Successfully purchased NFT!`);
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
