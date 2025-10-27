/**
 * Create Bundle Command
 * Creates a bundle of multiple NFTs for sale
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { waitForTransaction } from '@/providers/ProviderContext';
import { validateAddress, logger } from '@utils';

// Token type enum matching contract
enum TokenType {
  ERC721 = 0,
  ERC1155 = 1
}

// BundleItem struct matching contract
interface BundleItem {
  collection: string;
  tokenId: string | number;
  amount: number;
  tokenType: TokenType;
  isIncluded: boolean;
}

interface CreateBundleParams {
  nftAddresses: string[]; // comma-separated
  tokenIds: string[]; // comma-separated
  amounts?: number[]; // for ERC1155, optional
  price: string; // in ETH
  duration: number; // in days
  discountPercentage?: number; // 0-5000 (0-50%), optional
  description?: string;
  imageUrl?: string;
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

      // Detect token types for each NFT
      logger.info('Detecting NFT types...');
      const nftInterface = new ethers.Interface([
        'function supportsInterface(bytes4) view returns (bool)',
      ]);

      const bundleItems: BundleItem[] = [];

      for (let i = 0; i < nftAddresses.length; i++) {
        const nftAddress = nftAddresses[i];
        const tokenId = tokenIds[i];

        if (!nftAddress || !tokenId) {
          throw new Error(`Missing NFT address or token ID at index ${i}`);
        }

        const nftContract = new ethers.Contract(nftAddress, nftInterface, provider.provider);

        // Detect if ERC1155 (interface ID: 0xd9b67a26)
        let tokenType = TokenType.ERC721;
        try {
          const isERC1155 = await nftContract.supportsInterface!('0xd9b67a26');
          tokenType = isERC1155 ? TokenType.ERC1155 : TokenType.ERC721;
        } catch {
          // Default to ERC721 if detection fails
        }

        const amount = tokenType === TokenType.ERC721 ? 1 : (args.amounts?.[i] || 1);

        bundleItems.push({
          collection: nftAddress,
          tokenId: tokenId,
          amount,
          tokenType,
          isIncluded: true,
        });

        logger.info(`  ${i + 1}. ${nftAddress} - Token #${tokenId} (${tokenType === TokenType.ERC721 ? 'ERC721' : 'ERC1155'}) x${amount}`);
      }

      logger.space();

      // Calculate endTime (timestamp)
      const endTime = Math.floor(Date.now() / 1000) + durationInSeconds;

      logger.subsection('Bundle Details');
      logger.info(`NFTs in Bundle: ${bundleItems.length}`);
      logger.info(`Total Price: ${args.price} ETH`);
      if (args.discountPercentage) {
        logger.info(`Discount: ${args.discountPercentage / 100}%`);
      }
      logger.info(`Duration: ${args.duration} days`);
      logger.info(`Expires: ${new Date(endTime * 1000).toLocaleString()}`);
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

      // createBundle(BundleItem[], uint256, uint256, address, uint256, string, string)
      const tx = await bundleManager.createBundle!(
        bundleItems,                            // BundleItem[] calldata items
        priceInWei,                            // uint256 totalPrice
        args.discountPercentage || 0,          // uint256 discountPercentage (0-5000)
        ethers.ZeroAddress,                    // address paymentToken (0x0 = ETH)
        endTime,                               // uint256 endTime (timestamp)
        args.description || 'NFT Bundle',      // string calldata description
        args.imageUrl || ''                    // string calldata imageUrl
      );

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
