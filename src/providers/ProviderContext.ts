/**
 * Provider Context
 * Manages blockchain provider, signer, and contract addresses
 */

import { ethers } from 'ethers';
import { NetworkName, ProviderContext, ContractAddresses } from '@types';
import { getNetworkConfig } from '@/config/network.config';
import { ABIApiClient } from './abi/abi_api_client';
import { abiApiConfig, validateABIApiConfig } from '@config/abi_api_config';
import { logger } from '@utils';

/**
 * Creates provider context for blockchain interactions
 * @param network - Network to connect to
 * @returns Provider context with signer and addresses
 */
export async function createProviderContext(
  network: NetworkName = 'local'
): Promise<ProviderContext> {
  const config = await getNetworkConfig(network);

  // Create provider
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);

  // Get signer
  const accounts = await provider.listAccounts();
  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts found. Make sure the network is running.');
  }

  const signer = await provider.getSigner(0);
  const account = await signer.getAddress();

  // Get contract addresses from API
  const addresses = await getContractAddresses(network);

  // Log connection info
  logger.section(`Connected to ${network} network`);
  logger.info(`Account: ${account}`);

  const balance = await provider.getBalance(account);
  logger.info(`Balance: ${ethers.formatEther(balance)} ETH`);
  logger.space();

  return {
    provider,
    signer,
    account,
    config,
    addresses,
  };
}

/**
 * Gets contract addresses from ABI API
 * @param network - Network name
 * @returns Contract addresses
 */
async function getContractAddresses(network: NetworkName): Promise<ContractAddresses> {
  try {
    // Validate API config
    validateABIApiConfig(abiApiConfig);

    // Create API client
    const apiClient = new ABIApiClient(abiApiConfig.baseUrl, abiApiConfig.apiKey);

    logger.info(`Fetching contract addresses for ${network} network...`);

    // Fetch deployed contracts for this network
    const addressMap = await apiClient.fetchDeployedContracts(network);

    logger.success(`✓ Loaded ${addressMap.size} contract addresses`);

    // Map to ContractAddresses structure
    const addresses: ContractAddresses = {
      erc721Factory: addressMap.get('ERC721CollectionFactory') || '',
      erc1155Factory: addressMap.get('ERC1155CollectionFactory') || '',
      erc721Exchange: addressMap.get('ERC721NFTExchange') || '',
      erc1155Exchange: addressMap.get('ERC1155NFTExchange') || '',
      englishAuction: addressMap.get('EnglishAuction') || addressMap.get('AuctionFactory') || '',
      dutchAuction: addressMap.get('DutchAuction') || addressMap.get('AuctionFactory') || '',
      auctionFactory: addressMap.get('AuctionFactory') || '',
      feeRegistry: addressMap.get('FeeRegistry') || '',
      bundleManager: addressMap.get('BundleManager') || '',
      offerManager: addressMap.get('OfferManager') || '',
      listingHistoryTracker: addressMap.get('ListingHistoryTracker') || '',
    };

    // Validate critical addresses
    const missingAddresses: string[] = [];
    if (!addresses.erc721Factory) missingAddresses.push('ERC721CollectionFactory');
    if (!addresses.erc1155Factory) missingAddresses.push('ERC1155CollectionFactory');

    if (missingAddresses.length > 0) {
      logger.warning(
        `Missing critical contract addresses: ${missingAddresses.join(', ')}`
      );
      logger.warning(
        `Make sure contracts are registered in the ABI API for network: ${network}`
      );
    }

    return addresses;
  } catch (error) {
    throw new Error(
      `Failed to fetch contract addresses from API: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Formats collection parameters for contract calls
 * @param params - Raw collection parameters
 * @param owner - Owner address
 * @returns Formatted parameters
 */
export function formatCollectionParams(params: any, owner: string): any {
  return {
    name: params.name || 'Test Collection',
    symbol: params.symbol || 'TEST',
    owner: params.owner || owner,
    description: params.description || 'A test collection',
    mintPrice: typeof params.mintPrice === 'string'
      ? ethers.parseEther(params.mintPrice)
      : params.mintPrice || ethers.parseEther('0.01'),
    royaltyFee: params.royaltyFee || 500,
    maxSupply: params.maxSupply || 10000,
    mintLimitPerWallet: params.mintLimitPerWallet || 10,
    mintStartTime: params.mintStartTime || 0,
    allowlistMintPrice: params.allowlistMintPrice
      ? ethers.parseEther(params.allowlistMintPrice.toString())
      : ethers.parseEther('0.008'),
    publicMintPrice: params.publicMintPrice
      ? ethers.parseEther(params.publicMintPrice.toString())
      : ethers.parseEther('0.01'),
    allowlistStageDuration: params.allowlistStageDuration || 86400,
    tokenURI: params.tokenURI || params.baseURI || 'https://api.example.com/metadata/',
  };
}

/**
 * Waits for transaction and logs result
 * @param tx - Transaction to wait for
 * @param description - Description of the transaction
 * @returns Transaction receipt
 */
export async function waitForTransaction(
  tx: ethers.ContractTransactionResponse,
  description: string = 'Transaction'
): Promise<ethers.ContractTransactionReceipt> {
  console.log(`\n📤 ${description} sent`);
  console.log(`   Hash: ${tx.hash}`);
  console.log(`   Waiting for confirmation...`);

  const receipt = await tx.wait();

  if (!receipt) {
    throw new Error('Transaction receipt is null');
  }

  console.log(`✅ ${description} confirmed in block ${receipt.blockNumber}`);
  console.log(`   Gas used: ${receipt.gasUsed.toString()}`);

  return receipt;
}
