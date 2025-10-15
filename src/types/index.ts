/**
 * Core Type Definitions
 * Centralized type definitions for the entire application
 */

import { ethers } from 'ethers';

// ============================================================================
// Network & Configuration Types
// ============================================================================

export type NetworkName = 'local' | 'sepolia' | 'mainnet';

export interface NetworkConfig {
  rpcUrl: string;
  hubAddress: string;
  chainId: number;
}

export interface ContractAddresses {
  erc721Factory: string;
  erc1155Factory: string;
  erc721Exchange: string;
  erc1155Exchange: string;
  englishAuction?: string;
  dutchAuction?: string;
  auctionFactory: string;
  feeRegistry: string;
  bundleManager: string;
  offerManager: string;
  listingHistoryTracker: string;
}

// ============================================================================
// Provider Types
// ============================================================================

export interface ProviderContext {
  provider: ethers.JsonRpcProvider;
  signer: ethers.Signer;
  account: string;
  config: NetworkConfig;
  addresses: ContractAddresses;
}

// ============================================================================
// Collection Types
// ============================================================================

export interface CollectionParams {
  name: string;
  symbol: string;
  owner?: string;
  description: string;
  mintPrice: string | bigint;
  royaltyFee: number;
  maxSupply: number;
  mintLimitPerWallet: number;
  mintStartTime?: number;
  allowlistMintPrice?: string | bigint;
  publicMintPrice?: string | bigint;
  allowlistStageDuration?: number;
  tokenURI?: string;
  baseURI?: string;
}

export interface FormattedCollectionParams {
  name: string;
  symbol: string;
  owner: string;
  description: string;
  mintPrice: bigint;
  royaltyFee: number;
  maxSupply: number;
  mintLimitPerWallet: number;
  mintStartTime: number;
  allowlistMintPrice: bigint;
  publicMintPrice: bigint;
  allowlistStageDuration: number;
  tokenURI: string;
}

// ============================================================================
// Command Types
// ============================================================================

export interface CommandContext {
  provider: ProviderContext;
  abiProvider: IABIProvider;
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
// ABI Provider Types
// ============================================================================

export interface IABIProvider {
  getABI(contractName: string): Promise<any>;
  getContractInterface(contractName: string): Promise<ethers.Interface>;
}

export type ABIProviderType = 'manual' | 'api';

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
