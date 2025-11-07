/**
 * Cancel Offer Command
 * Cancels an active NFT offer and refunds the offerer
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { waitForTransaction } from '@/providers/ProviderContext';
import { logger } from '@utils';

interface CancelOfferParams {
  offerId: string;
  reason?: string;
}

export class CancelOfferCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'cancel-offer',
    description: 'Cancel an active NFT offer',
    category: 'offers',
    aliases: ['cancel-offer'],
  };

  async execute(context: CommandContext, args?: CancelOfferParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.offerId) {
        throw new Error('Offer ID is required');
      }

      const { provider } = context;
      const offerId = args.offerId;
      const reason = args.reason || 'User cancelled';

      logger.info(`Offer ID: ${offerId}`);
      logger.space();

      // Get offer manager address
      const offerManagerAddress = provider.addresses.offerManager;
      logger.info(`Offer Manager: ${offerManagerAddress}`);
      logger.space();

      // Get OfferManager ABI from API
      const offerManagerABI = await context.abiProvider.getABI('OfferManager');
      const offerManager = new ethers.Contract(offerManagerAddress, offerManagerABI, provider.signer);

      // Get offer details before cancelling
      try {
        const offer = await offerManager.s_offers!(offerId);

        logger.subsection('Offer Details');
        logger.info(`Offerer: ${offer.offerer}`);
        logger.info(`NFT Contract: ${offer.collection}`);
        logger.info(`Token ID: ${offer.tokenId.toString()}`);
        logger.info(`Offer Amount: ${ethers.formatEther(offer.amount)} ETH`);
        logger.space();

        // Validate user is the offerer
        if (offer.offerer.toLowerCase() !== provider.account.toLowerCase()) {
          throw new Error('You can only cancel your own offers');
        }

        if (offer.collection === ethers.ZeroAddress) {
          throw new Error('Invalid offer ID or offer does not exist');
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('You can only cancel')) {
          throw error;
        }
        logger.warning('Could not fetch offer details, proceeding with cancellation...');
      }

      // Cancel the offer
      logger.info(`Cancelling offer... Reason: ${reason}`);
      const tx = await offerManager.cancelOffer!(offerId, reason);
      await waitForTransaction(tx, 'Cancel Offer');

      logger.success('Offer Cancelled Successfully!');
      logger.info('Your escrowed ETH has been refunded');

      this.logSuccess('Offer cancelled successfully!');
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
      {
        type: 'input',
        name: 'reason',
        message: 'Cancellation reason (optional):',
        default: 'User cancelled',
      },
    ];
  }
}
