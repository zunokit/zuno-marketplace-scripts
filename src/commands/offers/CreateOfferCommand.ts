/**
 * Create Offer Command
 * Creates an offer for an NFT
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { waitForTransaction } from '@/providers/ProviderContext';
import { validateAddress, validatePositiveNumber, logger } from '@utils';

interface CreateOfferParams {
  nftAddress: string;
  tokenId: number | string;
  offerPrice: string; // in ETH
  duration: number; // in days
}

export class CreateOfferCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'create-offer',
    description: 'Create an offer for an NFT',
    category: 'offers',
    aliases: ['offer'],
  };

  async execute(context: CommandContext, args?: CreateOfferParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.nftAddress || !args?.tokenId || !args?.offerPrice || !args?.duration) {
        throw new Error('Missing required parameters');
      }

      validateAddress(args.nftAddress, 'NFT address');
      validatePositiveNumber(Number(args.tokenId), 'Token ID');
      validatePositiveNumber(Number(args.offerPrice), 'Offer price');
      validatePositiveNumber(args.duration, 'Duration');

      const { provider } = context;
      const priceInWei = ethers.parseEther(args.offerPrice);
      const durationInSeconds = args.duration * 24 * 60 * 60;

      // Calculate expiration timestamp (not duration)
      const expiration = Math.floor(Date.now() / 1000) + durationInSeconds;

      logger.subsection('Offer Details');
      logger.info(`NFT Contract: ${args.nftAddress}`);
      logger.info(`Token ID: ${args.tokenId}`);
      logger.info(`Offer Price: ${args.offerPrice} ETH`);
      logger.info(`Duration: ${args.duration} days`);
      logger.info(`Expires: ${new Date(expiration * 1000).toLocaleString()}`);
      logger.space();

      // Get offer manager address
      const offerManagerAddress = provider.addresses.offerManager;
      logger.info(`Offer Manager: ${offerManagerAddress}`);
      logger.space();

      // Create offer
      logger.info('Creating NFT offer...');

      // Get OfferManager ABI from API
      const offerManagerABI = await context.abiProvider.getABI('OfferManager');

      const offerManager = new ethers.Contract(offerManagerAddress, offerManagerABI, provider.signer);

      // createNFTOffer(address collection, uint256 tokenId, address paymentToken, uint256 amount, uint256 expiration)
      // Note: This is a payable function, ETH is sent as value
      const tx = await offerManager.createNFTOffer!(
        args.nftAddress,        // collection
        args.tokenId,           // tokenId
        ethers.ZeroAddress,     // paymentToken (0x0 = ETH)
        priceInWei,             // amount
        expiration,             // expiration timestamp
        { value: priceInWei }   // send ETH as payment
      );

      const receipt = await waitForTransaction(tx, 'Create Offer');

      // Extract offer ID from events
      let offerId: string | null = null;

      try {
        const possibleSignatures = [
          'OfferCreated(bytes32,address,address,uint256,uint256,uint256)',
          'OfferCreated(bytes32,address,uint256,address,uint256,uint256)',
          'OfferCreated(bytes32,address,uint256,uint256,uint256)',
        ];

        for (const sig of possibleSignatures) {
          const eventHash = ethers.id(sig);
          const offerEvent = receipt.logs.find((log) => log.topics[0] === eventHash);

          if (offerEvent && offerEvent.topics.length > 1) {
            offerId = offerEvent.topics[1] || null;
            logger.success('Offer Created Successfully!');
            logger.info(`Offer ID: ${offerId}`);

            const expirationDate = new Date(Date.now() + durationInSeconds * 1000);
            logger.info(`Expires: ${expirationDate.toLocaleString()}`);
            break;
          }
        }

        if (!offerId) {
          logger.warning('Could not extract offer ID from transaction');
          logger.info(`Transaction hash: ${receipt.hash}`);
        }
      } catch (error) {
        logger.warning('Event parsing failed');
        logger.info(`Transaction hash: ${receipt.hash}`);
      }

      logger.space();
      logger.subsection('Next Steps');
      logger.info('- Your offer is now visible to the NFT owner');
      logger.info('- The owner can accept your offer at any time');
      logger.info('- Your ETH is held in escrow until offer is accepted or expired');
      logger.info('- You can cancel the offer before it expires to get your ETH back');

      this.logSuccess('Offer created successfully!');
    } catch (error) {
      this.logError(error as Error);
      throw error;
    }
  }

  async getPrompts(): Promise<any[]> {
    return [
      {
        type: 'input',
        name: 'nftAddress',
        message: 'NFT contract address:',
        validate: (input: string) => ethers.isAddress(input) || 'Invalid address',
      },
      {
        type: 'input',
        name: 'tokenId',
        message: 'Token ID:',
        validate: (input: string) => !isNaN(Number(input)) || 'Invalid token ID',
      },
      {
        type: 'input',
        name: 'offerPrice',
        message: 'Your offer price (in ETH):',
        validate: (input: string) => (!isNaN(Number(input)) && Number(input) > 0) || 'Invalid price',
      },
      {
        type: 'number',
        name: 'duration',
        message: 'Offer duration (in days):',
        default: 7,
      },
    ];
  }
}
