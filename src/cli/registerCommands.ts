/**
 * Command Registration
 * Registers all available commands with the command registry
 */

import { commandRegistry } from '@core/CommandRegistry';

// Import all commands
import { CreateERC721Command, CreateERC1155Command } from '@commands/collections';
import { MintERC721Command, MintERC1155Command } from '@commands/nfts';
import { ListNFTCommand, BuyNFTCommand, CancelListingCommand } from '@commands/marketplace';
import { CreateAuctionCommand, PlaceBidCommand } from '@commands/auctions';
import { RunAllCommand } from '@commands/testing';

/**
 * Registers all commands
 * This function should be called at CLI startup
 */
export function registerAllCommands(): void {
  // Collection commands
  commandRegistry.register(new CreateERC721Command());
  commandRegistry.register(new CreateERC1155Command());

  // NFT commands
  commandRegistry.register(new MintERC721Command());
  commandRegistry.register(new MintERC1155Command());

  // Marketplace commands
  commandRegistry.register(new ListNFTCommand());
  commandRegistry.register(new BuyNFTCommand());
  commandRegistry.register(new CancelListingCommand());

  // Auction commands
  commandRegistry.register(new CreateAuctionCommand());
  commandRegistry.register(new PlaceBidCommand());

  // Testing commands
  commandRegistry.register(new RunAllCommand());
}
