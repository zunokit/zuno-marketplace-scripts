/**
 * Place Bid Command
 * Places a bid on an English auction or buys from a Dutch auction
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { waitForTransaction } from '@/providers/ProviderContext';
import { logger } from '@utils';

interface PlaceBidParams {
  auctionId: string;
  bidAmount?: string; // in ETH, for English auction
}

export class PlaceBidCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'place-bid',
    description: 'Place bid on auction or buy from Dutch auction',
    category: 'auctions',
    aliases: ['bid'],
  };

  async execute(context: CommandContext, args?: PlaceBidParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.auctionId) {
        throw new Error('Auction ID is required');
      }

      const { provider } = context;
      const auctionId = args.auctionId;

      logger.info(`Auction ID: ${auctionId}`);
      logger.space();

      // Get auction contract addresses
      const englishAuctionAddress = provider.addresses.englishAuction;
      const dutchAuctionAddress = provider.addresses.dutchAuction;

      // Get English auction ABI from API
      let auctionABI = await context.abiProvider.getABI('EnglishAuction');

      // Try English auction first
      let auctionContract = new ethers.Contract(englishAuctionAddress || '', auctionABI, provider.signer);
      let auctionDetails: any;
      let isEnglish = true;

      try {
        auctionDetails = await auctionContract.getAuction!(auctionId);
        if (!auctionDetails.isActive) {
          throw new Error('Not active');
        }
      } catch {
        // Try Dutch auction - fetch Dutch auction ABI
        auctionABI = await context.abiProvider.getABI('DutchAuction');
        auctionContract = new ethers.Contract(dutchAuctionAddress || '', auctionABI, provider.signer);
        auctionDetails = await auctionContract.getAuction!(auctionId);
        isEnglish = false;

        if (!auctionDetails.isActive) {
          throw new Error('Auction not found or not active');
        }
      }

      // Validate auction
      const now = Math.floor(Date.now() / 1000);
      if (now > Number(auctionDetails.endTime)) {
        throw new Error('Auction has ended');
      }

      if (auctionDetails.seller.toLowerCase() === provider.account.toLowerCase()) {
        throw new Error('You cannot bid on your own auction');
      }

      // Display auction details
      logger.subsection('Auction Details');
      logger.info(`Type: ${isEnglish ? 'English' : 'Dutch'} Auction`);
      logger.info(`Seller: ${auctionDetails.seller}`);
      logger.info(`NFT Contract: ${auctionDetails.nftContract}`);
      logger.info(`Token ID: ${auctionDetails.tokenId}`);

      const endTime = new Date(Number(auctionDetails.endTime) * 1000);
      const timeLeft = Number(auctionDetails.endTime) - now;
      const daysLeft = Math.floor(timeLeft / 86400);
      const hoursLeft = Math.floor((timeLeft % 86400) / 3600);
      const minutesLeft = Math.floor((timeLeft % 3600) / 60);

      logger.info(`Ends: ${endTime.toLocaleString()}`);
      logger.info(`Time Left: ${daysLeft}d ${hoursLeft}h ${minutesLeft}m`);
      logger.space();

      if (isEnglish) {
        // English auction - place bid
        logger.subsection('English Auction Info');
        logger.info(`Starting Price: ${ethers.formatEther(auctionDetails.startingPrice)} ETH`);

        if (auctionDetails.currentBid > 0n) {
          logger.info(`Current Bid: ${ethers.formatEther(auctionDetails.currentBid)} ETH`);
          logger.info(`Highest Bidder: ${auctionDetails.highestBidder}`);

          const minBidIncrement = (auctionDetails.currentBid * 101n) / 100n; // 1% increment
          logger.info(`Minimum Next Bid: ${ethers.formatEther(minBidIncrement)} ETH`);
        } else {
          logger.info('No bids yet');
          logger.info(`Minimum Bid: ${ethers.formatEther(auctionDetails.startingPrice)} ETH`);
        }
        logger.space();

        if (!args.bidAmount) {
          throw new Error('Bid amount is required for English auction');
        }

        const bidAmount = ethers.parseEther(args.bidAmount);

        // Validate bid amount
        const minimumBid =
          auctionDetails.currentBid > 0n
            ? (auctionDetails.currentBid * 101n) / 100n
            : auctionDetails.startingPrice;

        if (bidAmount < minimumBid) {
          throw new Error(`Bid must be at least ${ethers.formatEther(minimumBid)} ETH`);
        }

        // Check balance
        const balance = await provider.provider.getBalance(provider.account);
        if (balance < bidAmount) {
          throw new Error(
            `Insufficient balance. You have ${ethers.formatEther(balance)} ETH but need ${ethers.formatEther(bidAmount)} ETH`
          );
        }

        // Place bid
        logger.info(`Placing bid of ${args.bidAmount} ETH...`);
        const tx = await auctionContract.placeBid!(auctionId, { value: bidAmount });
        await waitForTransaction(tx, 'Place Bid');

        logger.success('Bid Placed Successfully!');
        logger.info(`Your Bid: ${ethers.formatEther(bidAmount)} ETH`);

        if (auctionDetails.currentBid > 0n) {
          logger.info('Note: The previous highest bidder will be automatically refunded.');
        }
      } else {
        // Dutch auction - buy at current price
        logger.subsection('Dutch Auction Info');
        logger.info(`Starting Price: ${ethers.formatEther(auctionDetails.startingPrice)} ETH`);

        const currentPrice = await auctionContract.getCurrentPrice!(auctionId);
        logger.info(`Current Price: ${ethers.formatEther(currentPrice)} ETH`);
        logger.space();

        // Check balance
        const balance = await provider.provider.getBalance(provider.account);
        if (balance < currentPrice) {
          throw new Error(
            `Insufficient balance. You have ${ethers.formatEther(balance)} ETH but need ${ethers.formatEther(currentPrice)} ETH`
          );
        }

        // Buy at current price
        logger.info('Purchasing at current price...');
        const tx = await auctionContract.buyNow!(auctionId, { value: currentPrice });
        await waitForTransaction(tx, 'Buy from Dutch Auction');

        logger.success('NFT Purchased Successfully!');
        logger.info(`Purchase Price: ${ethers.formatEther(currentPrice)} ETH`);
        logger.info(`NFT Contract: ${auctionDetails.nftContract}`);
        logger.info(`Token ID: ${auctionDetails.tokenId}`);
      }

      this.logSuccess(`${isEnglish ? 'Bid placed' : 'NFT purchased'} successfully!`);
    } catch (error) {
      this.logError(error as Error);
      throw error;
    }
  }

  async getPrompts(): Promise<any[]> {
    return [
      {
        type: 'input',
        name: 'auctionId',
        message: 'Auction ID:',
        validate: (input: string) => (input.length === 66 && input.startsWith('0x')) || 'Invalid auction ID format',
      },
      {
        type: 'input',
        name: 'bidAmount',
        message: 'Your bid amount (in ETH, for English auctions):',
        default: '',
      },
    ];
  }
}
