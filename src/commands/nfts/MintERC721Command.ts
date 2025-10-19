/**
 * Mint ERC721 NFT Command
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext, MintParams } from '@types';
import { waitForTransaction } from '@/providers/ProviderContext';
import { validateAddress, validatePositiveNumber, logger } from '@utils';

export class MintERC721Command extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'mint-erc721',
    description: 'Mint ERC721 NFTs',
    category: 'nfts',
    aliases: ['mint721'],
  };

  async execute(context: CommandContext, args?: MintParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.collectionAddress) {
        throw new Error('Collection address is required');
      }

      validateAddress(args.collectionAddress, 'Collection address');
      const quantity = args.quantity || 1;
      validatePositiveNumber(quantity, 'Quantity');

      const { provider } = context;
      const recipient = args.recipient || provider.account;

      // Get ERC721Collection ABI from API
      const collectionABI = await context.abiProvider.getABI('ERC721Collection');

      const collection = new ethers.Contract(args.collectionAddress, collectionABI, provider.signer);

      // Display collection info
      await this.displayCollectionInfo(collection, args.collectionAddress);

      // Get mint price
      let mintPrice: bigint;
      try {
        mintPrice = await collection.getMintPrice!();
      } catch {
        mintPrice = ethers.parseEther('0.01');
        logger.warning('Using default mint price: 0.01 ETH');
      }

      logger.info(`Mint Price: ${ethers.formatEther(mintPrice)} ETH`);

      const totalCost = mintPrice * BigInt(quantity);
      logger.info(`Total Cost for ${quantity} NFT(s): ${ethers.formatEther(totalCost)} ETH`);

      logger.subsection('Minting Parameters');
      logger.info(`Recipient: ${recipient}`);
      logger.info(`Quantity: ${quantity}`);
      logger.space();

      // Try minting
      let tx: ethers.ContractTransactionResponse;

      if (quantity > 1) {
        try {
          logger.info('Attempting batch mint...');
          tx = await collection.batchMintERC721!(recipient, quantity, { value: totalCost });
        } catch (error) {
          logger.warning('Batch mint failed, trying single mints...');
          await this.mintOneByOne(collection, recipient, quantity, mintPrice);
          return;
        }
      } else {
        logger.info('Minting single NFT...');
        tx = await collection.mint!(recipient, { value: mintPrice });
      }

      const receipt = await waitForTransaction(tx, 'Mint NFT');

      // Extract token IDs
      await this.extractTokenIds(collection, receipt);

      // Check new balance
      try {
        const balance = await collection.balanceOf!(recipient);
        logger.success(`New Balance: ${balance} NFTs`);
      } catch {
        // Ignore
      }

      this.logSuccess(`Successfully minted ${quantity} NFT(s)!`);
    } catch (error) {
      this.logError(error as Error);
      throw error;
    }
  }

  private async displayCollectionInfo(collection: ethers.Contract, address: string): Promise<void> {
    logger.subsection('Collection Information');
    logger.info(`Address: ${address}`);

    try {
      const name = await collection.name!();
      const symbol = await collection.symbol!();
      logger.info(`Name: ${name}`);
      logger.info(`Symbol: ${symbol}`);
    } catch {
      logger.warning('Unable to fetch collection name/symbol');
    }

    try {
      const totalMinted = await collection.getTotalMinted!();
      const maxSupply = await collection.getMaxSupply!();
      logger.info(`Supply: ${totalMinted}/${maxSupply}`);
    } catch {
      // Ignore
    }

    try {
      const stage = await collection.getCurrentStage!();
      const stageNames = ['INACTIVE', 'ALLOWLIST', 'PUBLIC'];
      logger.info(`Current Stage: ${stageNames[stage] || 'UNKNOWN'}`);
    } catch {
      // Ignore
    }

    logger.space();
  }

  private async mintOneByOne(
    collection: ethers.Contract,
    recipient: string,
    quantity: number,
    mintPrice: bigint
  ): Promise<void> {
    for (let i = 0; i < quantity; i++) {
      logger.info(`Minting NFT ${i + 1}/${quantity}...`);
      const tx = await collection.mint!(recipient, { value: mintPrice });
      await waitForTransaction(tx, `Mint NFT ${i + 1}/${quantity}`);
    }
    logger.success(`Successfully minted ${quantity} NFTs one by one!`);
  }

  private async extractTokenIds(
    collection: ethers.Contract,
    receipt: ethers.ContractTransactionReceipt
  ): Promise<void> {
    try {
      const transferEvents = receipt.logs.filter(log => {
        try {
          const parsed = collection.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
          return parsed?.name === 'Transfer';
        } catch {
          return false;
        }
      });

      if (transferEvents.length > 0) {
        logger.subsection('Minted Token IDs');
        transferEvents.forEach(event => {
          const parsed = collection.interface.parseLog({
            topics: event.topics as string[],
            data: event.data,
          });
          logger.info(`Token #${parsed!.args[2]}`);
        });
      }
    } catch {
      // Event parsing failed
    }
  }

  async getPrompts(): Promise<any[]> {
    return [
      {
        type: 'input',
        name: 'collectionAddress',
        message: 'Collection address:',
        validate: (input: string) => ethers.isAddress(input) || 'Invalid address',
      },
      {
        type: 'number',
        name: 'quantity',
        message: 'Quantity to mint:',
        default: 1,
      },
      {
        type: 'input',
        name: 'recipient',
        message: 'Recipient address (leave empty for yourself):',
        default: '',
      },
    ];
  }
}
