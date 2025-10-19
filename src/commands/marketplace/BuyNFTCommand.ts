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

/**
 * Listing status enum from BaseNFTExchange.sol
 * Pending(0), Active(1), Sold(2), Failed(3), Cancelled(4)
 */
enum ListingStatus {
  Pending = 0,
  Active = 1,
  Sold = 2,
  Failed = 3,
  Cancelled = 4,
}

interface Listing {
  contractAddress: string;
  tokenId: bigint;
  price: bigint;
  seller: string;
  listingDuration: bigint;
  listingStart: bigint;
  status: number; // uint8 from contract - use Number() to compare with ListingStatus enum
  amount: bigint;
}

export class BuyNFTCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'buy-nft',
    description: 'Buy NFT from marketplace',
    category: 'marketplace',
    aliases: ['buy'],
  };

  /**
   * Detects if an NFT contract is ERC721 (vs ERC1155)
   * Uses ERC165 supportsInterface check for ERC721 interface ID (0x80ac58cd)
   */
  private async detectNFTType(nftAddress: string, provider: ethers.Provider): Promise<boolean> {
    const nftInterface = new ethers.Interface(['function supportsInterface(bytes4) view returns (bool)']);
    const nftContract = new ethers.Contract(nftAddress, nftInterface, provider);

    try {
      return await nftContract.supportsInterface!('0x80ac58cd');
    } catch {
      // Default to ERC721 if supportsInterface not available
      return true;
    }
  }

  /**
   * Finds an active listing for a specific NFT (contractAddress + tokenId)
   * Uses getListingsByCollection to get all listings, then filters for active listing with matching tokenId
   *
   * Note: This is O(n) iteration. Contract has s_activeListings[contract][tokenId][seller] for O(1) lookup,
   * but we don't know the seller address, so we must iterate through all collection listings.
   */
  private async findActiveListingByNFT(
    exchange: ethers.Contract,
    nftAddress: string,
    tokenId: string | number
  ): Promise<string | null> {
    // Get all listing IDs for this NFT collection
    const listingIds: string[] = await exchange.getListingsByCollection!(nftAddress);

    // Iterate to find active listing with matching tokenId
    for (const id of listingIds) {
      const listing: Listing = await exchange.s_listings!(id);

      // Check if listing matches our criteria:
      // 1. Token ID matches
      // 2. Status is Active (1)
      // 3. Not expired (current time < listingStart + listingDuration)
      const isTokenMatch = listing.tokenId.toString() === tokenId.toString();
      // Convert to number for comparison since contract returns uint8
      const isActive = Number(listing.status) === ListingStatus.Active;
      const now = Math.floor(Date.now() / 1000);
      const expirationTime = Number(listing.listingStart) + Number(listing.listingDuration);
      const isNotExpired = now < expirationTime;

      if (isTokenMatch && isActive && isNotExpired) {
        return id;
      }
    }

    return null;
  }

  /**
   * Retrieves listing from either ERC721 or ERC1155 exchange
   * Tries ERC721 first, falls back to ERC1155 if not found
   */
  private async getListingFromExchanges(
    context: CommandContext,
    listingId: string,
    provider: any
  ): Promise<{ listing: Listing; exchange: ethers.Contract; exchangeAddress: string }> {
    // Try ERC721 exchange first
    let exchangeAddress = provider.addresses.erc721Exchange;
    let exchangeABI = await context.abiProvider.getABI('ERC721NFTExchange');
    let exchange = new ethers.Contract(exchangeAddress, exchangeABI, provider.signer);

    try {
      const listing: Listing = await exchange.s_listings!(listingId);
      // Verify listing exists (contractAddress should not be zero address)
      if (listing.contractAddress !== ethers.ZeroAddress) {
        return { listing, exchange, exchangeAddress };
      }
    } catch {
      // Continue to try ERC1155
    }

    // Try ERC1155 exchange
    exchangeAddress = provider.addresses.erc1155Exchange;
    exchangeABI = await context.abiProvider.getABI('ERC1155NFTExchange');
    exchange = new ethers.Contract(exchangeAddress, exchangeABI, provider.signer);
    const listing: Listing = await exchange.s_listings!(listingId);

    return { listing, exchange, exchangeAddress };
  }

  /**
   * Validates that a listing is purchasable
   * Checks: active status, not expired, not buying own NFT
   */
  private validateListing(listing: Listing, buyerAddress: string): void {
    // Check status is Active (1) - convert to number since contract returns uint8
    if (Number(listing.status) !== ListingStatus.Active) {
      const statusName = ListingStatus[Number(listing.status)];
      throw new Error(`Listing is not active. Current status: ${statusName}`);
    }

    // Check not expired
    const now = Math.floor(Date.now() / 1000);
    const expirationTime = Number(listing.listingStart) + Number(listing.listingDuration);
    if (expirationTime < now) {
      throw new Error('Listing has expired');
    }

    // Check not buying own NFT
    if (listing.seller.toLowerCase() === buyerAddress.toLowerCase()) {
      throw new Error('You cannot buy your own NFT');
    }
  }

  async execute(context: CommandContext, args?: BuyNFTParams): Promise<void> {
    this.logStart();

    try {
      const { provider } = context;
      let listingId = args?.listingId;

      // STEP 1: Find listing ID if not provided
      // User can provide either listingId directly, or (nftAddress + tokenId) to search
      if (!listingId && args?.nftAddress && args?.tokenId) {
        logger.info('Finding listing for NFT...');

        // Normalize address to checksum format (prevents ENS resolution on local network)
        const nftAddressChecksum = ethers.getAddress(args.nftAddress);

        // Detect NFT type (ERC721 vs ERC1155) to know which exchange to query
        const isERC721 = await this.detectNFTType(nftAddressChecksum, provider.provider);
        const exchangeAddress = isERC721
          ? provider.addresses.erc721Exchange
          : provider.addresses.erc1155Exchange;

        // Get appropriate exchange contract with full ABI
        const exchangeABIName = isERC721 ? 'ERC721NFTExchange' : 'ERC1155NFTExchange';
        const exchangeABI = await context.abiProvider.getABI(exchangeABIName);
        const exchange = new ethers.Contract(exchangeAddress, exchangeABI, provider.provider);

        // Find active listing for this NFT
        // Note: This iterates through all collection listings (O(n))
        // because we don't know the seller address for direct s_activeListings lookup (O(1))
        const foundListingId = await this.findActiveListingByNFT(exchange, nftAddressChecksum, args.tokenId);

        if (!foundListingId) {
          throw new Error('No active listing found for this NFT');
        }

        listingId = foundListingId;
      }

      if (!listingId) {
        throw new Error('Please provide either listingId or (nftAddress + tokenId)');
      }

      logger.info(`Listing ID: ${listingId}`);
      logger.space();

      // STEP 2: Get listing details from exchange
      // Try both ERC721 and ERC1155 exchanges to find the listing
      const { listing, exchange } = await this.getListingFromExchanges(context, listingId, provider);

      // STEP 3: Validate listing is purchasable
      this.validateListing(listing, provider.account);

      // Calculate expiration time for display
      const expirationTime = Number(listing.listingStart) + Number(listing.listingDuration);

      // STEP 4: Display listing details
      logger.subsection('Listing Details');
      logger.info(`Seller: ${listing.seller}`);
      logger.info(`NFT Contract: ${listing.contractAddress}`);
      logger.info(`Token ID: ${listing.tokenId.toString()}`);
      if (listing.amount > 1n) {
        logger.info(`Amount: ${listing.amount.toString()}`);
      }
      logger.info(`Price: ${ethers.formatEther(listing.price)} ETH`);

      const expirationDate = new Date(expirationTime * 1000);
      logger.info(`Expires: ${expirationDate.toLocaleString()}`);
      logger.space();

      // Total price (listing.price already includes marketplace fees in the contract logic)
      const totalPrice = listing.price;
      logger.info(`Total Price: ${ethers.formatEther(totalPrice)} ETH`);

      // STEP 5: Check buyer has sufficient balance
      const balance = await provider.provider.getBalance(provider.account);
      if (balance < totalPrice) {
        throw new Error(
          `Insufficient balance. You have ${ethers.formatEther(balance)} ETH but need ${ethers.formatEther(totalPrice)} ETH`
        );
      }

      logger.space();

      // STEP 6: Execute purchase transaction
      logger.info('Purchasing NFT...');
      const tx = await exchange.buyNFT!(listingId, { value: totalPrice });
      await waitForTransaction(tx, 'Buy NFT');

      // STEP 7: Display success message
      logger.success('NFT Purchased Successfully!');
      logger.info(`NFT Contract: ${listing.contractAddress}`);
      logger.info(`Token ID: ${listing.tokenId.toString()}`);
      if (listing.amount > 1n) {
        logger.info(`Amount: ${listing.amount.toString()}`);
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
