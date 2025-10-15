/**
 * Command Registry
 * Central registry for all available commands using Registry Pattern
 */

import { ICommand } from '../types';

/**
 * Command Registry - manages all available commands
 * Implements Registry Pattern for command discovery and execution
 */
export class CommandRegistry {
  private commands: Map<string, ICommand> = new Map();
  private categories: Map<string, string[]> = new Map();

  /**
   * Registers a command
   * @param command - Command to register
   */
  register(command: ICommand): void {
    const { name, category, aliases = [] } = command.metadata;

    // Register by primary name
    this.commands.set(name.toLowerCase(), command);

    // Register aliases
    aliases.forEach(alias => {
      this.commands.set(alias.toLowerCase(), command);
    });

    // Track category
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    if (!this.categories.get(category)!.includes(name)) {
      this.categories.get(category)!.push(name);
    }
  }

  /**
   * Gets a command by name or alias
   * @param name - Command name or alias
   * @returns Command instance or undefined
   */
  get(name: string): ICommand | undefined {
    return this.commands.get(name.toLowerCase());
  }

  /**
   * Gets all commands
   * @returns Array of all registered commands
   */
  getAll(): ICommand[] {
    const seen = new Set<ICommand>();
    const commands: ICommand[] = [];

    this.commands.forEach(command => {
      if (!seen.has(command)) {
        seen.add(command);
        commands.push(command);
      }
    });

    return commands;
  }

  /**
   * Gets commands by category
   * @param category - Category name
   * @returns Array of commands in the category
   */
  getByCategory(category: string): ICommand[] {
    const commandNames = this.categories.get(category) || [];
    return commandNames
      .map(name => this.get(name))
      .filter((cmd): cmd is ICommand => cmd !== undefined);
  }

  /**
   * Gets all categories
   * @returns Array of category names
   */
  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  /**
   * Checks if a command exists
   * @param name - Command name or alias
   * @returns True if command exists
   */
  has(name: string): boolean {
    return this.commands.has(name.toLowerCase());
  }

  /**
   * Gets command count
   * @returns Number of registered commands
   */
  count(): number {
    return new Set(this.commands.values()).size;
  }

  /**
   * Lists all commands grouped by category
   * @returns Object with categories and their commands
   */
  listByCategory(): Record<string, ICommand[]> {
    const result: Record<string, ICommand[]> = {};

    this.categories.forEach((_, category) => {
      result[category] = this.getByCategory(category);
    });

    return result;
  }
}

/**
 * Global command registry instance
 */
export const commandRegistry = new CommandRegistry();
