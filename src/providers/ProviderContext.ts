/**
 * Provider Context
 * Manages blockchain provider, signer, and contract addresses
 */

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { NetworkName, ProviderContext, ContractAddresses } from '../types';
import { getNetworkConfig } from '../config/network.config';

/**
 * Creates provider context for blockchain interactions
 * @param network - Network to connect to
 * @returns Provider context with signer and addresses
 */
export async function createProviderContext(
  network: NetworkName = 'local'
): Promise<ProviderContext> {
  const config = getNetworkConfig(network);

  // Create provider
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);

  // Get signer
  const accounts = await provider.listAccounts();
  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts found. Make sure the network is running.');
  }

  const signer = await provider.getSigner(0);
  const account = await signer.getAddress();

  // Get contract addresses
  const addresses = await getContractAddresses(config.hubAddress);

  // Log connection info
  console.log(`\n📡 Connected to ${network} network`);
  console.log(`👤 Account: ${account}`);

  const balance = await provider.getBalance(account);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);

  return {
    provider,
    signer,
    account,
    config,
    addresses,
  };
}

/**
 * Gets contract addresses from deployment file
 * @param hubAddress - MarketplaceHub address
 * @returns Contract addresses
 */
async function getContractAddresses(_hubAddress: string): Promise<ContractAddresses> {
  try {
    const deploymentPath = path.resolve(
      __dirname,
      '../../../zuno-marketplace-contracts/broadcast/DeployAll.s.sol/31337/run-latest.json'
    );

    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

    const contracts: Record<string, string> = {};
    deployment.transactions.forEach((tx: any) => {
      if (tx.contractName && tx.contractAddress) {
        contracts[tx.contractName] = tx.contractAddress;
      }
    });

    return {
      erc721Factory: contracts.ERC721CollectionFactory || '',
      erc1155Factory: contracts.ERC1155CollectionFactory || '',
      erc721Exchange: contracts.ERC721NFTExchange || '',
      erc1155Exchange: contracts.ERC1155NFTExchange || '',
      englishAuction: contracts.EnglishAuction || contracts.AuctionFactory || '',
      dutchAuction: contracts.DutchAuction || contracts.AuctionFactory || '',
      auctionFactory: contracts.AuctionFactory || '',
      feeRegistry: contracts.FeeRegistry || '',
      bundleManager: contracts.BundleManager || '',
      offerManager: contracts.OfferManager || '',
      listingHistoryTracker: contracts.ListingHistoryTracker || '',
    };
  } catch (error) {
    throw new Error(
      `Could not read contract addresses from deployment file: ${error instanceof Error ? error.message : 'Unknown error'}`
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
