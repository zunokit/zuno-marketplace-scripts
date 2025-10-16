/**
 * Mint ERC1155 NFT Command
 */

import { ethers } from 'ethers';
import { BaseCommand } from '../../core/Command.interface';
import { CommandMetadata, CommandContext, MintParams } from '../../types';
import { waitForTransaction } from '../../providers/ProviderContext';
import { validateAddress, validatePositiveNumber, logger } from '../../utils';

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

      const tokenId = args.tokenId ?? 1;
      const amount = args.amount || 1;
      validatePositiveNumber(amount, 'Amount');

      const { provider } = context;
      const recipient = args.recipient || provider.account;

      // Get mint ABI
      const mintABI = [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function balanceOf(address account, uint256 id) view returns (uint256)',
        'function mint(address to, uint256 id, uint256 amount) external payable',
        'function batchMintERC1155(address to, uint256 id, uint256 amount) external payable',
        'function getMintPrice() external view returns (uint256)',
        'function getTotalMinted() external view returns (uint256)',
        'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)',
      ];

      const collection = new ethers.Contract(args.collectionAddress, mintABI, provider.signer);

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
      logger.info(`Token ID: ${tokenId}`);
      logger.info(`Amount: ${amount}`);
      logger.space();

      // Try minting
      let tx: ethers.ContractTransactionResponse;

      try {
        logger.info('Attempting batch mint...');
        tx = await collection.batchMintERC1155!(recipient, tokenId, amount, { value: totalCost });
      } catch {
        logger.info('Batch mint not available, trying single mint...');
        tx = await collection.mint!(recipient, tokenId, amount, { value: totalCost });
      }

      await waitForTransaction(tx, 'Mint ERC1155');

      // Check new balance
      try {
        const balance = await collection.balanceOf!(recipient, tokenId);
        logger.success(`New Balance for Token #${tokenId}: ${balance}`);
      } catch {
        // Ignore
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
        name: 'tokenId',
        message: 'Token ID:',
        default: 1,
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
