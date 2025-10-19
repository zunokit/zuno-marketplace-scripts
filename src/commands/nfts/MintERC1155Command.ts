/**
 * Mint ERC1155 NFT Command
 */

import { ethers } from 'ethers';
import { BaseCommand } from '@core/Command.interface';
import { CommandMetadata, CommandContext, MintParams } from '@types';
import { waitForTransaction } from '@/providers/ProviderContext';
import { validateAddress, validatePositiveNumber, logger } from '@utils';
import { ERC1155_COLLECTION_ABI } from '@/shared/abis/collectionAbis';

export class MintERC1155Command extends BaseCommand {
  metadata: CommandMetadata = {
    name: 'mint-erc1155',
    description: 'Mint ERC1155 NFTs',
    category: 'nfts',
    aliases: ['mint1155'],
  };

  async execute(context: CommandContext, args?: MintParams): Promise<void> {
    this.logStart();

    try {
      if (!args?.collectionAddress) {
        throw new Error('Collection address is required');
      }

      validateAddress(args.collectionAddress, 'Collection address');

      const amount = args.amount || 1;
      validatePositiveNumber(amount, 'Amount');

      const { provider } = context;
      const recipient = args.recipient || provider.account;

      // Use minimal ERC1155 Collection ABI (not available in API - deployed dynamically)
      const collection = new ethers.Contract(
        args.collectionAddress,
        ERC1155_COLLECTION_ABI,
        provider.signer
      );

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

      const totalCost = mintPrice * BigInt(amount);
      logger.info(`Total Cost for ${amount} token(s): ${ethers.formatEther(totalCost)} ETH`);

      logger.subsection('Minting Parameters');
      logger.info(`Recipient: ${recipient}`);
      logger.info(`Amount: ${amount}`);
      logger.space();

      // Try minting - ERC1155Collection auto-generates token IDs
      let tx: ethers.ContractTransactionResponse;

      if (amount > 1) {
        try {
          logger.info('Attempting batch mint...');
          tx = await collection.batchMintERC1155!(recipient, amount, { value: totalCost });
        } catch (error) {
          logger.warning('Batch mint failed, trying single mint...');
          tx = await collection.mint!(recipient, amount, { value: totalCost });
        }
      } else {
        logger.info('Minting single NFT...');
        tx = await collection.mint!(recipient, amount, { value: totalCost });
      }

      const receipt = await waitForTransaction(tx, 'Mint ERC1155');

      // Extract token ID from events
      let mintedTokenId: bigint | null = null;
      try {
        const mintedEvents = receipt.logs.filter(log => {
          try {
            const parsed = collection.interface.parseLog({
              topics: log.topics as string[],
              data: log.data,
            });
            return parsed?.name === 'Minted';
          } catch {
            return false;
          }
        });

        if (mintedEvents.length > 0) {
          const parsed = collection.interface.parseLog({
            topics: mintedEvents[0]!.topics as string[],
            data: mintedEvents[0]!.data,
          });
          mintedTokenId = parsed!.args[1]; // tokenId is second argument in Minted event
          logger.info(`Minted Token ID: ${mintedTokenId}`);
        }
      } catch {
        // Event parsing failed
      }

      // Check new balance
      if (mintedTokenId !== null) {
        try {
          const balance = await collection.balanceOf!(recipient, mintedTokenId);
          logger.success(`Balance for Token #${mintedTokenId}: ${balance}`);
        } catch {
          // Ignore
        }
      }

      this.logSuccess(`Successfully minted ${amount} token(s)!`);
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
      logger.info(`Total Minted: ${totalMinted}`);
    } catch {
      // Ignore
    }

    logger.space();
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
        name: 'amount',
        message: 'Amount to mint:',
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
