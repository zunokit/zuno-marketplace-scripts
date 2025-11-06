/**
 * Accept Offer Command
 * Accepts an NFT offer from a buyer
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { waitForTransaction } from '@/providers/ProviderContext';
import { logger } from '@utils';

interface AcceptOfferParams {
  offerId: string;
}

export class AcceptOfferCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'accept-offer',
    description: 'Accept an NFT offer',
    category: 'offers',
    aliases: ['accept'],
  };

  async execute(context: CommandContext, args?: AcceptOfferParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.offerId) {
        throw new Error('Offer ID is required');
      }

      const { provider } = context;
      const offerId = args.offerId;

      logger.info(`Offer ID: ${offerId}`);
      logger.space();

      // Get offer manager address
      const offerManagerAddress = provider.addresses.offerManager;
      logger.info(`Offer Manager: ${offerManagerAddress}`);
      logger.space();

      // Get OfferManager ABI from API
      const offerManagerABI = await context.abiProvider.getABI('OfferManager');
      const offerManager = new ethers.Contract(offerManagerAddress, offerManagerABI, provider.signer);

      // Get offer details before accepting
      try {
        const offer = await offerManager.s_offers!(offerId);

        logger.subsection('Offer Details');
        logger.info(`Offerer: ${offer.offerer}`);
        logger.info(`NFT Contract: ${offer.collection}`);
        logger.info(`Token ID: ${offer.tokenId.toString()}`);
        logger.info(`Offer Amount: ${ethers.formatEther(offer.amount)} ETH`);
        logger.space();

        // Validate offer exists
        if (offer.collection === ethers.ZeroAddress) {
          throw new Error('Invalid offer ID or offer does not exist');
        }
      } catch (error) {
        logger.warning('Could not fetch offer details, proceeding with acceptance...');
      }

      // Check current blockchain time
      const currentBlock = await provider.provider.getBlock('latest');
      logger.info(`Current block timestamp: ${currentBlock?.timestamp}`);
      logger.space();

      // Accept the offer
      logger.info('Accepting offer...');
      const tx = await offerManager.acceptNFTOffer!(offerId);
      await waitForTransaction(tx, 'Accept Offer');

      logger.success('Offer Accepted Successfully!');
      logger.info('The NFT has been transferred to the buyer');
      logger.info('You have received the offer amount in ETH');

      this.logSuccess('Offer accepted successfully!');
    } catch (error) {
      this.logError(error as Error);
      throw error;
    }
  }

  async getPrompts(): Promise<any[]> {
    return [
      {
        type: 'input',
        name: 'offerId',
        message: 'Offer ID:',
        validate: (input: string) => (input.length === 66 && input.startsWith('0x')) || 'Invalid offer ID format',
      },
    ];
  }
}
