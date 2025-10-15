/**
 * Manual ABI Provider
 * Loads ABIs from local filesystem (current implementation)
 */

import * as path from 'path';
import { ABIProviderBase } from './ABIProvider.interface';

/**
 * Manual ABI Provider - loads ABIs from local JSON files
 * This is the current implementation that will be replaced by APIABIProvider later
 */
export class ManualABIProvider extends ABIProviderBase {
  private abiCache: Map<string, any> = new Map();
  private abiDirectory: string;

  constructor(abiDirectory?: string) {
    super();
    this.abiDirectory = abiDirectory || path.resolve(__dirname, '../../../src/lib/contracts/abis');
  }

  /**
   * Loads ABI from local filesystem
   * @param contractName - Name of the contract
   * @returns Contract ABI
   */
  async getABI(contractName: string): Promise<any> {
    // Check cache first
    if (this.abiCache.has(contractName)) {
      return this.abiCache.get(contractName);
    }

    try {
      // Try to load from file
      const abiPath = path.join(this.abiDirectory, `${contractName}.json`);
      const abi = require(abiPath);

      this.validateABI(abi, contractName);
      this.abiCache.set(contractName, abi);

      return abi;
    } catch (error) {
      throw new Error(
        `Failed to load ABI for ${contractName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Clears the ABI cache
   */
  clearCache(): void {
    this.abiCache.clear();
  }

  /**
   * Gets the ABI directory path
   */
  getABIDirectory(): string {
    return this.abiDirectory;
  }
}
