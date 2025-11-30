/**
 * Core Type Definitions
 */

import { ethers } from 'ethers';
import { ZunoSDK } from 'zuno-marketplace-sdk';

// Network Types
export type NetworkName = 'local' | 'sepolia' | 'mainnet';

export interface NetworkConfig {
  rpcUrl: string;
  chainId: number;
}

// Command Types
export interface CommandContext {
  sdk: ZunoSDK;
  provider: ethers.JsonRpcProvider;
  signer: ethers.Signer;
  account: string;
  network: NetworkName;
}

export interface CommandMetadata {
  name: string;
  description: string;
  category: string;
  aliases?: string[];
}

export interface ICommand {
  metadata: CommandMetadata;
  execute(context: CommandContext, args?: any): Promise<void>;
  getPrompts?(): Promise<any[]>;
}

// Collection Params (for CLI prompts)
export interface CollectionParams {
  name: string;
  symbol: string;
  maxSupply: number;
  mintPrice?: string;
  royaltyFee?: number;
  mintLimitPerWallet?: number;
  tokenURI?: string;
}

// Mint Params (for CLI prompts)
export interface MintParams {
  collectionAddress: string;
  recipient?: string;
  quantity?: number;
  amount?: number;
}
