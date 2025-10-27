/**
 * Create Bundle Command
 * Creates a bundle of multiple NFTs for sale
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { waitForTransaction } from '@/providers/ProviderContext';
import { validateAddress, logger } from '@utils';

interface CreateBundleParams {
  nftAddresses: string[]; // comma-separated
  tokenIds: string[]; // comma-separated
  price: string; // in ETH
  duration: number; // in days
}

export class CreateBundleCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'create-bundle',
    description: 'Create a bundle of NFTs for sale',
    category: 'bundles',
    aliases: ['bundle'],
  };

  async execute(context: CommandContext, args?: CreateBundleParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.nftAddresses || !args?.tokenIds || !args?.price || !args?.duration) {
        throw new Error('Missing required parameters');
      }

      const { provider } = context;

      // Parse inputs
      const nftAddresses = Array.isArray(args.nftAddresses)
        ? args.nftAddresses
        : String(args.nftAddresses).split(',').map((s: string) => s.trim());
      const tokenIds = Array.isArray(args.tokenIds)
        ? args.tokenIds
        : String(args.tokenIds).split(',').map((s: string) => s.trim());

      if (nftAddresses.length !== tokenIds.length) {
        throw new Error('Number of NFT addresses must match number of token IDs');
      }

      if (nftAddresses.length < 2) {
        throw new Error('Bundle must contain at least 2 NFTs');
      }

      // Validate addresses
      nftAddresses.forEach((addr: string, i: number) => validateAddress(addr, `NFT address ${i + 1}`));

      const priceInWei = ethers.parseEther(args.price);
      const durationInSeconds = args.duration * 24 * 60 * 60;

      logger.subsection('Bundle Details');
      logger.info(`NFTs in Bundle: ${nftAddresses.length}`);
      nftAddresses.forEach((addr: string, i: number) => {
        logger.info(`  ${i + 1}. ${addr} - Token #${tokenIds[i]}`);
      });
      logger.info(`Bundle Price: ${args.price} ETH`);
      logger.info(`Duration: ${args.duration} days`);
      logger.space();

      // Get bundle manager address
      const bundleManagerAddress = provider.addresses.bundleManager;
      logger.info(`Bundle Manager: ${bundleManagerAddress}`);
      logger.space();

      // Note: In production, you'd need to approve each NFT to the bundle manager
      logger.warning('Note: Make sure all NFTs in the bundle are approved to the Bundle Manager');
      logger.space();

      // Create bundle
      logger.info('Creating bundle...');

      // Get BundleManager ABI from API
      const bundleManagerABI = await context.abiProvider.getABI('BundleManager');

      const bundleManager = new ethers.Contract(bundleManagerAddress, bundleManagerABI, provider.signer);

      const tx = await bundleManager.createBundle!(nftAddresses, tokenIds, priceInWei, durationInSeconds);

      const receipt = await waitForTransaction(tx, 'Create Bundle');

      // Extract bundle ID from events
      let bundleId: string | null = null;

      try {
        const possibleSignatures = [
          'BundleCreated(bytes32,address,address[],uint256[],uint256,uint256)',
          'BundleCreated(bytes32,address,uint256,uint256)',
          'BundleCreated(bytes32,address,address[],uint256[])',
        ];

        for (const sig of possibleSignatures) {
          const eventHash = ethers.id(sig);
          const bundleEvent = receipt.logs.find((log) => log.topics[0] === eventHash);

          if (bundleEvent && bundleEvent.topics.length > 1) {
            bundleId = bundleEvent.topics[1] || null;
            logger.success('Bundle Created Successfully!');
            logger.info(`Bundle ID: ${bundleId}`);

            const expirationDate = new Date(Date.now() + durationInSeconds * 1000);
            logger.info(`Expires: ${expirationDate.toLocaleString()}`);
            break;
          }
        }

        if (!bundleId) {
          logger.warning('Could not extract bundle ID from transaction');
          logger.info(`Transaction hash: ${receipt.hash}`);
        }
      } catch (error) {
        logger.warning('Event parsing failed');
        logger.info(`Transaction hash: ${receipt.hash}`);
      }

      this.logSuccess('Bundle created successfully!');
    } catch (error) {
      this.logError(error as Error);
      throw error;
    }
  }

  async getPrompts(): Promise<any[]> {
    return [
      {
        type: 'input',
        name: 'nftAddresses',
        message: 'NFT contract addresses (comma-separated):',
        validate: (input: string) => input.split(',').length >= 2 || 'Bundle must contain at least 2 NFTs',
      },
      {
        type: 'input',
        name: 'tokenIds',
        message: 'Token IDs (comma-separated, matching order):',
      },
      {
        type: 'input',
        name: 'price',
        message: 'Bundle price (in ETH):',
        validate: (input: string) => (!isNaN(Number(input)) && Number(input) > 0) || 'Invalid price',
      },
      {
        type: 'number',
        name: 'duration',
        message: 'Bundle duration (in days):',
        default: 7,
      },
    ];
  }
}
