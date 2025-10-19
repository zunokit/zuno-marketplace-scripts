/**
 * CLI Prompts
 * Inquirer prompt configurations
 */

import inquirer from 'inquirer';
import { commandRegistry } from '@core/CommandRegistry';
import { NetworkName } from '@types';
import { getAvailableNetworks } from '@config/network.config';
import { getAvailableAccounts, AccountInfo } from '@/providers/ProviderContext';

/**
 * Main menu prompt
 */
export async function promptMainMenu(): Promise<string> {
  const categories = commandRegistry.getCategories();
  const choices = [
    ...categories.map(cat => ({
      name: `${cat.charAt(0).toUpperCase() + cat.slice(1)} Commands`,
      value: cat,
    })),
    new inquirer.Separator(),
    { name: 'Exit', value: 'exit' },
  ];

  const { category } = await inquirer.prompt([
    {
      type: 'list',
      name: 'category',
      message: 'What would you like to do?',
      choices,
    },
  ]);

  return category;
}

/**
 * Category commands prompt
 */
export async function promptCategoryCommands(category: string): Promise<string> {
  const commands = commandRegistry.getByCategory(category);

  const choices = [
    ...commands.map(cmd => ({
      name: cmd.metadata.description,
      value: cmd.metadata.name,
    })),
    new inquirer.Separator(),
    { name: 'Back to Main Menu', value: 'back' },
  ];

  const { command } = await inquirer.prompt([
    {
      type: 'list',
      name: 'command',
      message: `Select a command from ${category}:`,
      choices,
    },
  ]);

  return command;
}

/**
 * Network selection prompt
 */
export async function promptNetwork(): Promise<NetworkName | 'exit'> {
  const networks = await getAvailableNetworks();

  const { network } = await inquirer.prompt([
    {
      type: 'list',
      name: 'network',
      message: 'Select network:',
      choices: [
        ...networks.map((net: NetworkName) => ({
          name: net.charAt(0).toUpperCase() + net.slice(1),
          value: net,
        })),
        new inquirer.Separator(),
        { name: 'Exit Application', value: 'exit' },
      ],
      default: 'local',
      loop: false,
    },
  ]);

  return network;
}

/**
 * Command arguments prompt
 */
export async function promptCommandArgs(commandName: string): Promise<any> {
  const command = commandRegistry.get(commandName);

  if (!command || !command.getPrompts) {
    return {};
  }

  const prompts = await command.getPrompts();

  if (prompts.length === 0) {
    return {};
  }

  return await inquirer.prompt(prompts);
}

/**
 * Confirmation prompt
 */
export async function promptConfirm(message: string, defaultValue: boolean = false): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue,
    },
  ]);

  return confirmed;
}

/**
 * Continue prompt
 */
export async function promptContinue(): Promise<boolean> {
  return await promptConfirm('Continue?', true);
}

/**
 * Account selection prompt
 * @param network - Network to get accounts from
 * @returns Selected account index or null to use default
 */
export async function promptAccountSelection(network: NetworkName): Promise<number | null> {
  const accounts = await getAvailableAccounts(network);

  // If only one account, use it without prompting
  if (accounts.length === 1) {
    return 0;
  }

  // Show max 10 accounts for better UX
  const displayAccounts = accounts.slice(0, 10);

  const choices = [
    ...displayAccounts.map((acc: AccountInfo) => ({
      name: `Account #${acc.index}: ${acc.address} (${parseFloat(acc.balance).toFixed(4)} ETH)`,
      value: acc.index,
    })),
    new inquirer.Separator(),
    { name: 'Use Default (Account #0)', value: null },
  ];

  const { accountIndex } = await inquirer.prompt([
    {
      type: 'list',
      name: 'accountIndex',
      message: 'Select account:',
      choices,
      default: 0,
      loop: false,
    },
  ]);

  return accountIndex ?? 0;
}
