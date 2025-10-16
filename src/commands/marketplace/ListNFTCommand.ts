/**
 * List NFT Command
 * Lists an NFT for sale on the marketplace
 */

import { ethers } from 'ethers';
import { BaseCommand } from '../../core/Command.interface';
import { CommandMetadata, CommandContext } from '../../types';
import { waitForTransaction } from '../../providers/ProviderContext';
import { validateAddress, validatePositiveNumber, logger } from '../../utils';
import { detectNFTStandard, checkOwnership, checkApproval, approveOperator } from '../../utils/nft.utils';

interface ListNFTParams {
  nftAddress: string;
  tokenId: number | string;
  price: string; // in ETH
  duration: number; // in days
  amount?: number; // for ERC1155 only
}

export class ListNFTCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'list-nft',
    description: 'List NFT for sale on marketplace',
    category: 'marketplace',
    aliases: ['list'],
  };

  async execute(context: CommandContext, args?: ListNFTParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.nftAddress || !args?.tokenId || !args?.price || !args?.duration) {
        throw new Error('Missing required parameters: nftAddress, tokenId, price, duration');
      }

      validateAddress(args.nftAddress, 'NFT address');
      validatePositiveNumber(Number(args.tokenId), 'Token ID');
      validatePositiveNumber(Number(args.price), 'Price');
      validatePositiveNumber(args.duration, 'Duration');

      const { provider } = context;
      const nftAddress = args.nftAddress;
      const tokenId = args.tokenId;
      const priceInWei = ethers.parseEther(args.price);
      const durationInSeconds = args.duration * 24 * 60 * 60;

      logger.subsection('Listing Details');
      logger.info(`NFT Contract: ${nftAddress}`);
      logger.info(`Token ID: ${tokenId}`);
      logger.info(`Price: ${args.price} ETH`);
      logger.info(`Duration: ${args.duration} days`);
      logger.space();

      // Create NFT contract instance
      const nftABI = [
        'function supportsInterface(bytes4) view returns (bool)',
        'function ownerOf(uint256) view returns (address)',
        'function balanceOf(address,uint256) view returns (uint256)',
        'function isApprovedForAll(address,address) view returns (bool)',
        'function setApprovalForAll(address,bool)',
      ];
      const nftContract = new ethers.Contract(nftAddress, nftABI, provider.signer);

      // Detect NFT standard
      logger.info('Detecting NFT type...');
      const standard = await detectNFTStandard(nftContract, tokenId);
      logger.success(`Detected ${standard} NFT`);

      // Determine exchange address
      let exchangeAddress: string;
      let amount = 1;

      if (standard === 'ERC721') {
        // Check ownership
        const isOwner = await checkOwnership(nftContract, tokenId, provider.account);
        if (!isOwner) {
          throw new Error(`You don't own token ID ${tokenId}`);
        }
        exchangeAddress = provider.addresses.erc721Exchange;
      } else {
        // ERC1155
        const balance = await nftContract.balanceOf!(provider.account, tokenId);
        logger.info(`Your balance: ${balance}`);

        if (balance === 0n) {
          throw new Error(`You don't own any tokens of ID ${tokenId}`);
        }

        amount = args.amount || 1;
        if (BigInt(amount) > balance) {
          throw new Error(`You only have ${balance} tokens, cannot list ${amount}`);
        }

        exchangeAddress = provider.addresses.erc1155Exchange;
      }

      logger.info(`Exchange address: ${exchangeAddress}`);
      logger.space();

      // Check and handle approval
      logger.info('Checking approval status...');
      const isApproved = await checkApproval(nftContract, provider.account, exchangeAddress);

      if (!isApproved) {
        logger.warning('Not approved. Approving marketplace...');
        const approveTx = await approveOperator(nftContract, exchangeAddress);
        await waitForTransaction(approveTx, 'Approve Marketplace');
        logger.success('Marketplace approved!');
      } else {
        logger.success('Already approved!');
      }
      logger.space();

      // List the NFT
      logger.info('Listing NFT on marketplace...');

      const exchangeABI = [
        'function listNFT(address,uint256,uint256,uint256) returns (bytes32)',
        'function listNFT(address,uint256,uint256,uint256,uint256) returns (bytes32)',
        'event NFTListed(bytes32,address,uint256,address,uint256,uint256,address,uint256)',
      ];

      const exchange = new ethers.Contract(exchangeAddress, exchangeABI, provider.signer);

      let tx: ethers.ContractTransactionResponse;

      if (standard === 'ERC721') {
        tx = await exchange['listNFT(address,uint256,uint256,uint256)']!(
          nftAddress,
          tokenId,
          priceInWei,
          durationInSeconds
        );
      } else {
        tx = await exchange['listNFT(address,uint256,uint256,uint256,uint256)']!(
          nftAddress,
          tokenId,
          amount,
          priceInWei,
          durationInSeconds
        );
      }

      const receipt = await waitForTransaction(tx, 'List NFT');

      // Extract listing ID from events
      try {
        const listingEvent = receipt.logs.find(
          (log) =>
            log.topics[0] ===
            ethers.id('NFTListed(bytes32,address,uint256,address,uint256,uint256,address,uint256)')
        );

        if (listingEvent) {
          const listingId = listingEvent.topics[1];
          logger.success('NFT Listed Successfully!');
          logger.info(`Listing ID: ${listingId}`);
        }
      } catch {
        // Event parsing failed
      }

      // Calculate expiration
      const expirationDate = new Date(Date.now() + durationInSeconds * 1000);
      logger.info(`Expires: ${expirationDate.toLocaleString()}`);

      this.logSuccess(`NFT listed successfully on marketplace!`);
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
        name: 'price',
        message: 'Listing price (in ETH):',
        validate: (input: string) => !isNaN(Number(input)) && Number(input) > 0 || 'Invalid price',
      },
      {
        type: 'number',
        name: 'duration',
        message: 'Listing duration (in days):',
        default: 7,
      },
      {
        type: 'number',
        name: 'amount',
        message: 'Amount to list (for ERC1155, leave empty for 1):',
        default: 1,
      },
    ];
  }
}
