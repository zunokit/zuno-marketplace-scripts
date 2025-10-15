/**
 * API ABI Provider
 * Fetches ABIs from API endpoint (future implementation)
 */

import { ABIProviderBase } from './ABIProvider.interface';

/**
 * API ABI Provider - fetches ABIs from remote API
 * This will be implemented after the API at E:\zuno-marketplace-abis is completed
 */
export class APIABIProvider extends ABIProviderBase {
  private apiBaseUrl: string;
  private abiCache: Map<string, any> = new Map();
  private cacheDuration: number; // Cache duration in milliseconds

  constructor(apiBaseUrl: string, cacheDuration: number = 5 * 60 * 1000) {
    super();
    this.apiBaseUrl = apiBaseUrl;
    this.cacheDuration = cacheDuration;
  }

  /**
   * Fetches ABI from remote API
   * @param contractName - Name of the contract
   * @returns Contract ABI
   */
  async getABI(contractName: string): Promise<any> {
    // Check cache first
    const cached = this.abiCache.get(contractName);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.abi;
    }

    try {
      // TODO: Implement API call when E:\zuno-marketplace-abis is ready
      const response = await fetch(`${this.apiBaseUrl}/abis/${contractName}`);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const abi = await response.json();
      this.validateABI(abi, contractName);

      // Cache with timestamp
      this.abiCache.set(contractName, {
        abi,
        timestamp: Date.now(),
      });

      return abi;
    } catch (error) {
      throw new Error(
        `Failed to fetch ABI for ${contractName} from API: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Checks if cached ABI is still valid
   * @param timestamp - Cache timestamp
   * @returns True if cache is valid
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheDuration;
  }

  /**
   * Clears the ABI cache
   */
  clearCache(): void {
    this.abiCache.clear();
  }

  /**
   * Sets a new cache duration
   * @param duration - Duration in milliseconds
   */
  setCacheDuration(duration: number): void {
    this.cacheDuration = duration;
  }
}
