#!/usr/bin/env node

/**
 * CLI Launcher
 * Entry point for command-line interface
 */

import { CLI } from '@cli/index';
import { logger } from '@utils';

async function main(): Promise<void> {
  const cli = new CLI();

  try {
    await cli.initialize();
    await cli.run();
    process.exit(0);
  } catch (error) {
    logger.error(`Fatal error: ${(error as Error).message}`);

    if (process.env.DEBUG) {
      console.error(error);
    }

    process.exit(1);
  }
}

// Run CLI
main();
