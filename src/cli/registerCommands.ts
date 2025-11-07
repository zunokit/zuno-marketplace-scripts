/**
 * Command Registration
 * Registers all available commands with the command registry
 */

import { commandRegistry } from '@core/CommandRegistry';

// Import all commands
import { CreateERC721Command, CreateERC1155Command } from '@commands/collections';
import { MintERC721Command, MintERC1155Command } from '@commands/nfts';
import {
  ListNFTCommand,
  BuyNFTCommand,
  CancelListingCommand,
  ViewListingsCommand,
  SearchMarketplaceCommand,
} from '@commands/marketplace';
import { CreateAuctionCommand, PlaceBidCommand } from '@commands/auctions';
import { CreateBundleCommand } from '@commands/bundles';
import { CreateOfferCommand, AcceptOfferCommand, CancelOfferCommand } from '@commands/offers';
import { CollectionStatsCommand } from '@commands/analytics';
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
  commandRegistry.register(new ViewListingsCommand());
  commandRegistry.register(new SearchMarketplaceCommand());

  // Auction commands
  commandRegistry.register(new CreateAuctionCommand());
  commandRegistry.register(new PlaceBidCommand());

  // Bundle commands
  commandRegistry.register(new CreateBundleCommand());

  // Offer commands
  commandRegistry.register(new CreateOfferCommand());
  commandRegistry.register(new AcceptOfferCommand());
  commandRegistry.register(new CancelOfferCommand());

  // Analytics commands
  commandRegistry.register(new CollectionStatsCommand());

  // Testing commands
  commandRegistry.register(new RunAllCommand());
}
