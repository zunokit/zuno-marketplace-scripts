/**
 * SDK Context
 * Manages ZunoSDK instance for CLI commands
 */

import { ethers } from 'ethers';
import { ZunoSDK } from 'zuno-marketplace-sdk';
import { NetworkName } from '@types';
import { getNetworkConfig } from '@/config/network.config';
import { logger } from '@utils';

export interface SDKContext {
  sdk: ZunoSDK;
  provider: ethers.JsonRpcProvider;
  signer: ethers.Signer;
  account: string;
  network: NetworkName;
}

/**
 * Creates SDK context for CLI commands
 */
export async function createSDKContext(
  network: NetworkName = 'local',
  accountIndex: number = 0
): Promise<SDKContext> {
  const config = await getNetworkConfig(network);

  // Create provider
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);

  // Get signer
  const accounts = await provider.listAccounts();
  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts found. Make sure the network is running.');
  }

  if (accountIndex >= accounts.length) {
    throw new Error(
      `Account index ${accountIndex} out of bounds. Available accounts: ${accounts.length}`
    );
  }

  const signer = await provider.getSigner(accountIndex);
  const account = await signer.getAddress();

  // Get API key from environment
  const apiKey = process.env.ZUNO_API_KEY || process.env.ABI_API_KEY;
  if (!apiKey) {
    throw new Error('ZUNO_API_KEY or ABI_API_KEY is required in .env');
  }

  // Create SDK instance
  const sdk = new ZunoSDK({
    apiKey,
    network: config.chainId,
    logger: { level: process.env.DEBUG ? 'debug' : 'info' },
  });

  // Set provider and signer
  sdk.setProvider(provider, signer);

  // Log connection info
  logger.section(`Connected to ${network} network`);
  logger.info(`Account: ${account}`);

  const balance = await provider.getBalance(account);
  logger.info(`Balance: ${ethers.formatEther(balance)} ETH`);
  logger.space();

  return {
    sdk,
    provider,
    signer,
    account,
    network,
  };
}

/**
 * Gets available accounts with balances
 */
export async function getAvailableAccounts(
  network: NetworkName = 'local'
): Promise<Array<{ index: number; address: string; balance: string }>> {
  const config = await getNetworkConfig(network);
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);

  const accounts = await provider.listAccounts();
  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts found. Make sure the network is running.');
  }

  const accountsInfo = [];
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    if (!account) continue;

    const address = account.address;
    const balance = await provider.getBalance(address);
    accountsInfo.push({
      index: i,
      address,
      balance: ethers.formatEther(balance),
    });
  }

  return accountsInfo;
}

/**
 * Waits for transaction and logs result
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
