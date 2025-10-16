/**
 * Command Interface
 * Base interface and abstract class for all commands using Command Pattern
 */

import { ICommand, CommandMetadata, CommandContext } from '../types';

/**
 * Abstract base class for all commands
 * Implements Command Pattern for extensible script execution
 */
export abstract class BaseCommand implements ICommand {
  abstract metadata: CommandMetadata;

  /**
   * Executes the command
   * @param context - Command context with provider and ABI provider
   * @param args - Optional arguments for the command
   */
  abstract execute(context: CommandContext, args?: any): Promise<void>;

  /**
   * Gets inquirer prompts for interactive mode
   * Override this method to provide custom prompts
   * @returns Array of inquirer prompt objects
   */
  async getPrompts?(): Promise<any[]> {
    return [];
  }

  /**
   * Validates command arguments
   * Override this method to add custom validation
   * @param _args - Arguments to validate
   * @throws {Error} If validation fails
   */
  protected validate(_args?: any): void {
    // Default implementation does nothing
    // Override in subclasses for specific validation
  }

  /**
   * Logs command start
   */
  protected logStart(): void {
    console.log(`\n🚀 ${this.metadata.description}`);
    console.log(`${'='.repeat(50)}\n`);
  }

  /**
   * Logs command success
   */
  protected logSuccess(message?: string): void {
    console.log(`\n✅ ${message || 'Command completed successfully!'}`);
  }

  /**
   * Logs command error
   */
  protected logError(error: Error): void {
    console.error(`\n❌ Error: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
  }
}
