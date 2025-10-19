/**
 * Create Auction Command
 * Creates an English or Dutch auction for an NFT
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext } from '@types';
import { waitForTransaction } from '@/providers/ProviderContext';
import { validateAddress, validatePositiveNumber, logger } from '@utils';
import { detectNFTStandard, checkOwnership, checkApproval, approveOperator } from '@/utils/nft.utils';

interface CreateAuctionParams {
  auctionType: 'english' | 'dutch';
  nftAddress: string;
  tokenId: number | string;
  startingPrice: string; // in ETH
  endingPrice?: string; // for Dutch auction only
  reservePrice?: string; // for English auction only
  duration: number; // in days
  amount?: number; // for ERC1155 only
}

export class CreateAuctionCommand extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'create-auction',
    description: 'Create an auction (English or Dutch) for NFT',
    category: 'auctions',
    aliases: ['auction'],
  };

  async execute(context: CommandContext, args?: CreateAuctionParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.auctionType || !args?.nftAddress || !args?.tokenId || !args?.startingPrice || !args?.duration) {
        throw new Error('Missing required parameters');
      }

      validateAddress(args.nftAddress, 'NFT address');
      validatePositiveNumber(Number(args.tokenId), 'Token ID');
      validatePositiveNumber(Number(args.startingPrice), 'Starting price');
      validatePositiveNumber(args.duration, 'Duration');

      const { provider } = context;
      const isEnglish = args.auctionType === 'english';

      // Parse prices
      const startingPrice = ethers.parseEther(args.startingPrice);
      const endingPrice = args.endingPrice ? ethers.parseEther(args.endingPrice) : 0n;
      const reservePrice = args.reservePrice ? ethers.parseEther(args.reservePrice) : 0n;
      const durationInSeconds = args.duration * 24 * 60 * 60;

      // Validate auction-specific parameters
      if (!isEnglish && !args.endingPrice) {
        throw new Error('Dutch auction requires ending price');
      }
      if (!isEnglish && endingPrice >= startingPrice) {
        throw new Error('Ending price must be lower than starting price for Dutch auction');
      }
      if (isEnglish && reservePrice > 0n && reservePrice < startingPrice) {
        throw new Error('Reserve price must be higher than starting price');
      }

      logger.subsection('Auction Details');
      logger.info(`Type: ${isEnglish ? 'English' : 'Dutch'} Auction`);
      logger.info(`NFT Contract: ${args.nftAddress}`);
      logger.info(`Token ID: ${args.tokenId}`);
      logger.info(`Starting Price: ${args.startingPrice} ETH`);
      if (!isEnglish && args.endingPrice) {
        logger.info(`Ending Price: ${args.endingPrice} ETH`);
      }
      if (isEnglish && args.reservePrice) {
        logger.info(`Reserve Price: ${args.reservePrice} ETH`);
      }
      logger.info(`Duration: ${args.duration} days`);
      logger.space();

      // Create NFT contract instance with minimal interface
      const nftInterface = new ethers.Interface([
        'function supportsInterface(bytes4) view returns (bool)',
        'function ownerOf(uint256) view returns (address)',
        'function balanceOf(address,uint256) view returns (uint256)',
        'function isApprovedForAll(address,address) view returns (bool)',
        'function setApprovalForAll(address,bool)',
        'function approve(address,uint256)',
        'function getApproved(uint256) view returns (address)',
      ]);
      const nftContract = new ethers.Contract(args.nftAddress, nftInterface, provider.signer);

      // Detect NFT standard
      logger.info('Detecting NFT type...');
      const standard = await detectNFTStandard(nftContract, args.tokenId);
      logger.success(`Detected ${standard} NFT`);

      // Check ownership
      let amount = 1;
      if (standard === 'ERC721') {
        const isOwner = await checkOwnership(nftContract, args.tokenId, provider.account);
        if (!isOwner) {
          throw new Error(`You don't own token ID ${args.tokenId}`);
        }
      } else {
        const balance = await nftContract.balanceOf!(provider.account, args.tokenId);
        logger.info(`Your balance: ${balance}`);

        if (balance === 0n) {
          throw new Error(`You don't own any tokens of ID ${args.tokenId}`);
        }

        amount = args.amount || 1;
        if (BigInt(amount) > balance) {
          throw new Error(`You only have ${balance} tokens, cannot auction ${amount}`);
        }
      }

      // Get auction factory address
      const auctionFactoryAddress = provider.addresses.auctionFactory;
      logger.info(`Auction Factory: ${auctionFactoryAddress}`);
      logger.space();

      // Check and handle approval
      logger.info('Checking approval status...');

      if (standard === 'ERC721') {
        // Check specific token approval
        try {
          const approvedAddress = await nftContract.getApproved!(args.tokenId);
          if (approvedAddress.toLowerCase() !== auctionFactoryAddress.toLowerCase()) {
            logger.warning('Not approved. Approving auction factory...');
            const approveTx = await nftContract.approve!(auctionFactoryAddress, args.tokenId);
            await waitForTransaction(approveTx, 'Approve Auction Factory');
            logger.success('Auction factory approved!');
          } else {
            logger.success('Already approved!');
          }
        } catch {
          // Fallback to setApprovalForAll
          const isApproved = await checkApproval(nftContract, provider.account, auctionFactoryAddress);
          if (!isApproved) {
            logger.warning('Not approved. Approving auction factory...');
            const approveTx = await approveOperator(nftContract, auctionFactoryAddress);
            await waitForTransaction(approveTx, 'Approve Auction Factory');
            logger.success('Auction factory approved!');
          } else {
            logger.success('Already approved!');
          }
        }
      } else {
        // ERC1155 - use setApprovalForAll
        const isApproved = await checkApproval(nftContract, provider.account, auctionFactoryAddress);
        if (!isApproved) {
          logger.warning('Not approved. Approving auction factory...');
          const approveTx = await approveOperator(nftContract, auctionFactoryAddress);
          await waitForTransaction(approveTx, 'Approve Auction Factory');
          logger.success('Auction factory approved!');
        } else {
          logger.success('Already approved!');
        }
      }

      logger.space();

      // Create auction
      logger.info('Creating auction...');

      // Get AuctionFactory ABI from API
      const auctionFactoryABI = await context.abiProvider.getABI('AuctionFactory');

      const auctionFactory = new ethers.Contract(auctionFactoryAddress, auctionFactoryABI, provider.signer);

      let tx: ethers.ContractTransactionResponse;

      if (isEnglish) {
        tx = await auctionFactory.createEnglishAuction!(
          args.nftAddress,
          args.tokenId,
          amount,
          startingPrice,
          reservePrice,
          durationInSeconds
        );
      } else {
        tx = await auctionFactory.createDutchAuction!(
          args.nftAddress,
          args.tokenId,
          amount,
          startingPrice,
          endingPrice,
          durationInSeconds
        );
      }

      const receipt = await waitForTransaction(tx, 'Create Auction');

      // Extract auction ID from events
      try {
        const auctionEvent = receipt.logs.find(
          (log) => log.topics[0] === ethers.id('AuctionCreated(bytes32,uint8,address,address,uint256,uint256,uint256)')
        );

        if (auctionEvent) {
          const auctionId = auctionEvent.topics[1];
          logger.success('Auction Created Successfully!');
          logger.info(`Auction ID: ${auctionId}`);
          logger.info(`Type: ${isEnglish ? 'English' : 'Dutch'} Auction`);

          const endTime = new Date(Date.now() + durationInSeconds * 1000);
          logger.info(`Ends: ${endTime.toLocaleString()}`);
        }
      } catch {
        // Event parsing failed
      }

      if (isEnglish) {
        logger.space();
        logger.subsection('Next Steps');
        logger.info('- Share the auction ID with potential bidders');
        logger.info('- Bidders can place bids using the bid command');
        logger.info(`- Auction will end automatically after ${args.duration} days`);
        if (reservePrice > 0n) {
          logger.info('- Reserve price must be met for sale to complete');
        }
      } else {
        logger.space();
        logger.subsection('Next Steps');
        logger.info(`- Price will decrease linearly over ${args.duration} days`);
        logger.info('- Anyone can buy at the current price');
        logger.info('- Auction ends when someone buys or time expires');
      }

      this.logSuccess(`${isEnglish ? 'English' : 'Dutch'} auction created successfully!`);
    } catch (error) {
      this.logError(error as Error);
      throw error;
    }
  }

  async getPrompts(): Promise<any[]> {
    return [
      {
        type: 'list',
        name: 'auctionType',
        message: 'Select auction type:',
        choices: [
          { name: 'English Auction (ascending bids)', value: 'english' },
          { name: 'Dutch Auction (descending price)', value: 'dutch' },
        ],
      },
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
        name: 'startingPrice',
        message: (answers: any) =>
          answers.auctionType === 'english' ? 'Starting bid (in ETH):' : 'Starting price (high, in ETH):',
        validate: (input: string) => (!isNaN(Number(input)) && Number(input) > 0) || 'Invalid price',
      },
      {
        type: 'input',
        name: 'endingPrice',
        message: 'Ending price (low, in ETH):',
        when: (answers: any) => answers.auctionType === 'dutch',
        validate: (input: string) => (!isNaN(Number(input)) && Number(input) > 0) || 'Invalid price',
      },
      {
        type: 'input',
        name: 'reservePrice',
        message: 'Reserve price (in ETH, 0 for none):',
        when: (answers: any) => answers.auctionType === 'english',
        default: '0',
      },
      {
        type: 'number',
        name: 'duration',
        message: 'Auction duration (in days):',
        default: 7,
      },
      {
        type: 'number',
        name: 'amount',
        message: 'Amount to auction (for ERC1155, default: 1):',
        default: 1,
      },
    ];
  }
}
