/**
 * Core Type Definitions
 */

import { ethers } from 'ethers';
import { ZunoSDK } from 'zuno-marketplace-sdk';

// Re-export SDK types for convenience
export type {
  CreateERC721CollectionParams,
  CreateERC1155CollectionParams,
  MintERC721Params,
  MintERC1155Params,
  BatchMintERC721Params,
  ListNFTParams,
  BatchListNFTParams,
  BuyNFTParams,
  BatchBuyNFTParams,
  CancelListingParams,
  BatchCancelListingParams,
  CreateEnglishAuctionParams,
  CreateDutchAuctionParams,
  BatchCreateEnglishAuctionParams,
  BatchCreateDutchAuctionParams,
  PlaceBidParams,
  TransactionOptions,
  TransactionReceipt,
  Listing,
  Collection,
  Auction,
  TokenStandard,
} from 'zuno-marketplace-sdk';

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
  execute(context: CommandContext, args?: unknown): Promise<void>;
  getPrompts?(): Promise<PromptQuestion[]>;
}

/**
 * Inquirer prompt question type
 */
export interface PromptQuestion {
  type: string;
  name: string;
  message: string | ((answers: Record<string, unknown>) => string);
  default?: unknown;
  choices?: Array<{ name: string; value: unknown }>;
  validate?: (input: unknown, answers?: Record<string, unknown>) => boolean | string;
  when?: (answers: Record<string, unknown>) => boolean;
  filter?: (input: unknown) => unknown;
}
