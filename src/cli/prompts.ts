/**
 * CLI Prompts
 * Inquirer prompt configurations
 */

import inquirer from 'inquirer';
import { commandRegistry } from '../core/CommandRegistry';
import { NetworkName } from '../types';
import { getAvailableNetworks } from '../config/network.config';

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
  const networks = getAvailableNetworks();

  const { network } = await inquirer.prompt([
    {
      type: 'list',
      name: 'network',
      message: 'Select network:',
      choices: [
        ...networks.map(net => ({
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
