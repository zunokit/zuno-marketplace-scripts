#!/usr/bin/env node

/**
 * CLI Entry Point
 * Main entry point for the interactive CLI
 */

import { createProviderContext } from '@providers/ProviderContext';
import { createABIProvider } from '@providers/abi';
import { commandRegistry } from '@core/CommandRegistry';
import { CommandContext, NetworkName } from '@types';
import { logger } from '@utils';
import {
  promptMainMenu,
  promptCategoryCommands,
  promptNetwork,
  promptAccountSelection,
  promptCommandArgs,
  promptContinue,
} from '@cli/prompts';

// Register all commands
import { registerAllCommands } from '@cli/registerCommands';

/**
 * Main CLI application
 */
class CLI {
  private context: CommandContext | null = null;
  private network: NetworkName = 'local';

  constructor() {
    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      console.log('\n');
      this.displayGoodbye();
      process.exit(0);
    });
  }

  /**
   * Initializes the CLI
   */
  async initialize(): Promise<void> {
    this.displayBanner();

    // Prompt for network selection
    const selectedNetwork = await promptNetwork();

    // Check if user wants to exit
    if (selectedNetwork === 'exit') {
      this.displayGoodbye();
      process.exit(0);
    }

    this.network = selectedNetwork;

    // Prompt for account selection
    logger.info('Loading accounts...');
    const selectedAccountIndex = await promptAccountSelection(this.network);

    // Create ABI provider first (needed for fetching contract addresses)
    logger.info('Initializing ABI provider...');
    const abiProvider = createABIProvider();

    // Create provider context with selected account
    logger.info('Connecting to network...');
    const provider = await createProviderContext(this.network, selectedAccountIndex ?? 0);

    this.context = {
      provider,
      abiProvider,
    };

    // Register all commands
    registerAllCommands();

    logger.success('CLI initialized successfully!');
    logger.info(`Total commands available: ${commandRegistry.count()}`);
    logger.space();
  }

  /**
   * Runs the main CLI loop
   */
  async run(): Promise<void> {
    if (!this.context) {
      throw new Error('CLI not initialized. Call initialize() first.');
    }

    let running = true;

    while (running) {
      try {
        // Show main menu
        const category = await promptMainMenu();

        if (category === 'exit') {
          running = false;
          continue;
        }

        // Show category commands
        const commandName = await promptCategoryCommands(category);

        if (commandName === 'back') {
          continue;
        }

        // Get command
        const command = commandRegistry.get(commandName);

        if (!command) {
          logger.error(`Command not found: ${commandName}`);
          continue;
        }

        // Get command arguments
        const args = await promptCommandArgs(commandName);

        // Execute command
        logger.section(`Executing: ${command.metadata.description}`);
        await command.execute(this.context, args);

        logger.space();
        const shouldContinue = await promptContinue();

        if (!shouldContinue) {
          running = false;
        }
      } catch (error) {
        logger.error(`Command execution failed: ${(error as Error).message}`);

        if (process.env.DEBUG) {
          console.error(error);
        }

        const shouldContinue = await promptContinue();
        if (!shouldContinue) {
          running = false;
        }
      }
    }

    this.displayGoodbye();
  }

  /**
   * Displays welcome banner
   */
  private displayBanner(): void {
    console.clear();
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║        🚀 Zuno Marketplace Contract Testing CLI 🚀       ║
║                                                           ║
║     Professional toolkit for NFT marketplace testing     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
  }

  /**
   * Displays goodbye message
   */
  private displayGoodbye(): void {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║              Thank you for using Zuno CLI! 👋            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
  }
}

// Export CLI class for programmatic usage
export { CLI };
