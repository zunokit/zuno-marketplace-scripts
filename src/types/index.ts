/**
 * Core Type Definitions
 * Centralized type definitions for the entire application
 */

import { ethers } from 'ethers';
import { ZunoSDK } from 'zuno-marketplace-sdk';

// ============================================================================
// Network & Configuration Types
// ============================================================================

export type NetworkName = 'local' | 'sepolia' | 'mainnet';

export interface NetworkConfig {
  id?: string;
  rpcUrl: string;
  chainId: number;
}

// ============================================================================
// SDK Context (replaces old ProviderContext + ABIProvider)
// ============================================================================

export interface SDKContext {
  sdk: ZunoSDK;
  provider: ethers.JsonRpcProvider;
  signer: ethers.Signer;
  account: string;
  network: NetworkName;
}

// ============================================================================
// Collection Types
// ============================================================================

export interface CollectionParams {
  name: string;
  symbol: string;
  owner?: string;
  description?: string;
  mintPrice?: string;
  royaltyFee?: number;
  maxSupply: number;
  mintLimitPerWallet?: number;
  mintStartTime?: number;
  allowlistMintPrice?: string;
  publicMintPrice?: string;
  allowlistStageDuration?: number;
  tokenURI?: string;
}

// ============================================================================
// Command Types
// ============================================================================

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

// ============================================================================
// NFT Types
// ============================================================================

export type NFTStandard = 'ERC721' | 'ERC1155';

export interface NFTInfo {
  address: string;
  tokenId: string | number;
  standard: NFTStandard;
  owner?: string;
  balance?: bigint;
  amount?: number;
}

export interface MintParams {
  collectionAddress: string;
  recipient?: string;
  quantity?: number;
  tokenId?: number;
  amount?: number;
}

// ============================================================================
// Marketplace Types
// ============================================================================

export interface ListingParams {
  nftAddress: string;
  tokenId: string | number;
  price: string;
  duration: number;
  amount?: number;
}

export interface OfferParams {
  type: 'nft' | 'collection' | 'trait';
  nftAddress: string;
  tokenId?: string | number;
  price: string;
  duration: number;
  traitType?: string;
  traitValue?: string;
}

export interface AuctionParams {
  type: 'english' | 'dutch';
  nftAddress: string;
  tokenId: string | number;
  startingPrice: string;
  endingPrice?: string;
  reservePrice?: string;
  duration: number;
  amount?: number;
}

// ============================================================================
// Transaction Types
// ============================================================================

export interface TransactionResult {
  hash: string;
  blockNumber: number;
  gasUsed: bigint;
  events?: any[];
}

// ============================================================================
// Utility Types
// ============================================================================

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
