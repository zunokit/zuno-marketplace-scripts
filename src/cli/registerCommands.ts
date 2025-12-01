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
  SetAllowlistOnlyCommand,
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
} from '@commands/marketplace';
import { 
  CreateAuctionCommand, 
  PlaceBidCommand,
  CancelAuctionCommand,
  BatchCreateAuctionCommand,
  BatchCancelAuctionCommand,
  BuyNowCommand,
  SettleAuctionCommand,
  WithdrawBidCommand,
} from '@commands/auctions';

/**
 * Registers all commands
 * This function should be called at CLI startup
 */
export function registerAllCommands(): void {
  // Collection commands
  commandRegistry.register(new CreateERC721Command());
  commandRegistry.register(new CreateERC1155Command());
  commandRegistry.register(new AddToAllowlistCommand());
  commandRegistry.register(new SetAllowlistOnlyCommand());

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

  // Auction commands
  commandRegistry.register(new CreateAuctionCommand());
  commandRegistry.register(new PlaceBidCommand());
  commandRegistry.register(new CancelAuctionCommand());
  commandRegistry.register(new BatchCreateAuctionCommand());
  commandRegistry.register(new BatchCancelAuctionCommand());
  commandRegistry.register(new BuyNowCommand());
  commandRegistry.register(new SettleAuctionCommand());
  commandRegistry.register(new WithdrawBidCommand());
}
