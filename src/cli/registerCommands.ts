/**
 * Command Registration
 * Registers all available commands with the command registry
 */

import { commandRegistry } from '@core/CommandRegistry';

// Import all commands
import {
  CreateERC721Command,
  CreateERC1155Command,
  AddToAllowlistCommand,
  RemoveFromAllowlistCommand,
  SetAllowlistOnlyCommand,
  CheckAllowlistCommand,
  CheckAllowlistModeCommand,
  SetupAllowlistCommand,
  GetCollectionInfoCommand,
  ListCollectionsCommand,
  GetOwnedTokensCommand,
  VerifyCollectionCommand,
  OwnerMintCommand,
} from '@commands/collections';
import {
  MintERC721Command,
  MintERC1155Command,
  BatchMintERC721Command,
  BatchMintERC1155Command,
} from '@commands/nfts';
import {
  ListNFTCommand,
  BuyNFTCommand,
  CancelListingCommand,
  BatchListNFTCommand,
  BatchBuyNFTCommand,
  BatchCancelListingCommand,
  GetListingCommand,
  GetListingsCommand,
  GetListingsBySellerCommand,
  GetBuyerPriceCommand,
} from '@commands/marketplace';
import {
  CreateAuctionCommand,
  CreateDutchAuctionCommand,
  PlaceBidCommand,
  CancelAuctionCommand,
  BatchCreateAuctionCommand,
  BatchCreateEnglishAuctionCommand,
  BatchCreateDutchAuctionCommand,
  BatchCancelAuctionCommand,
  BuyNowCommand,
  SettleAuctionCommand,
  WithdrawBidCommand,
  GetAuctionCommand,
  GetAuctionPriceCommand,
  GetPendingRefundCommand,
} from '@commands/auctions';
import { ClearCacheCommand } from '@commands/utility';

/**
 * Registers all commands
 * This function should be called at CLI startup
 */
export function registerAllCommands(): void {
  // Collection commands
  commandRegistry.register(new CreateERC721Command());
  commandRegistry.register(new CreateERC1155Command());
  commandRegistry.register(new AddToAllowlistCommand());
  commandRegistry.register(new RemoveFromAllowlistCommand());
  commandRegistry.register(new SetAllowlistOnlyCommand());
  commandRegistry.register(new CheckAllowlistCommand());
  commandRegistry.register(new CheckAllowlistModeCommand());
  commandRegistry.register(new SetupAllowlistCommand());
  commandRegistry.register(new GetCollectionInfoCommand());
  commandRegistry.register(new ListCollectionsCommand());
  commandRegistry.register(new GetOwnedTokensCommand());
  commandRegistry.register(new VerifyCollectionCommand());
  commandRegistry.register(new OwnerMintCommand());

  // NFT commands
  commandRegistry.register(new MintERC721Command());
  commandRegistry.register(new MintERC1155Command());
  commandRegistry.register(new BatchMintERC721Command());
  commandRegistry.register(new BatchMintERC1155Command());

  // Marketplace commands
  commandRegistry.register(new ListNFTCommand());
  commandRegistry.register(new BuyNFTCommand());
  commandRegistry.register(new CancelListingCommand());
  commandRegistry.register(new BatchListNFTCommand());
  commandRegistry.register(new BatchBuyNFTCommand());
  commandRegistry.register(new BatchCancelListingCommand());
  commandRegistry.register(new GetListingCommand());
  commandRegistry.register(new GetListingsCommand());
  commandRegistry.register(new GetListingsBySellerCommand());
  commandRegistry.register(new GetBuyerPriceCommand());

  // Auction commands
  commandRegistry.register(new CreateAuctionCommand());
  commandRegistry.register(new CreateDutchAuctionCommand());
  commandRegistry.register(new PlaceBidCommand());
  commandRegistry.register(new CancelAuctionCommand());
  commandRegistry.register(new BatchCreateAuctionCommand());
  commandRegistry.register(new BatchCreateEnglishAuctionCommand());
  commandRegistry.register(new BatchCreateDutchAuctionCommand());
  commandRegistry.register(new BatchCancelAuctionCommand());
  commandRegistry.register(new BuyNowCommand());
  commandRegistry.register(new SettleAuctionCommand());
  commandRegistry.register(new WithdrawBidCommand());
  commandRegistry.register(new GetAuctionCommand());
  commandRegistry.register(new GetAuctionPriceCommand());
  commandRegistry.register(new GetPendingRefundCommand());

  // Utility commands
  commandRegistry.register(new ClearCacheCommand());
}
