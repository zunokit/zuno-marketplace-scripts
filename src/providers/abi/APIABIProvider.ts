/**
 * API ABI Provider
 * Fetches ABIs from remote API with caching and retry logic
 */

import { ABIProviderBase } from './ABIProvider.interface';
import { ABIApiClient } from './abi_api_client';
import { ABICacheManager } from './abi_cache_manager';
import { ABIApiConfig } from '@config/abi_api_config';
import { ABIFetchOptions } from '@types';
import { ABINotFoundError, ABIValidationError } from '@/errors/abi_provider_errors';
import { validateABI } from '@/utils/abi_validator_utils';
import { logger } from '@utils';

/**
 * API-based ABI Provider
 * Fetches ABIs from remote API with intelligent caching and retry
 */
export class APIABIProvider extends ABIProviderBase {
  private apiClient: ABIApiClient;
  private cacheManager: ABICacheManager;
  private config: ABIApiConfig;
  private prefetchPromise?: Promise<void>;

  constructor(config: ABIApiConfig) {
    super();
    this.config = config;
    this.apiClient = new ABIApiClient(config.baseUrl, config.apiKey);
    this.cacheManager = new ABICacheManager(config.cache.ttl);

    // Auto prefetch if enabled
    if (config.prefetch.enabled && config.prefetch.contracts.length > 0) {
      this.prefetchPromise = this.prefetchABIs(config.prefetch.contracts);
    }
  }

  /**
   * Get ABI for a contract
   * @param contractName - Contract name
   * @param options - Fetch options (version, hash, cache bypass)
   * @returns ABI JSON
   */
  async getABI(contractName: string, options?: ABIFetchOptions): Promise<any> {
    const version = options?.version || this.config.version;
    const abiHash = options?.abiHash;
    const bypassCache = options?.bypassCache || false;

    // Wait for prefetch if running
    if (this.prefetchPromise) {
      await this.prefetchPromise;
      this.prefetchPromise = undefined; // Only wait once
    }

    // Generate cache key
    const cacheKey = ABICacheManager.generateKey(contractName, version, abiHash);

    // Check cache first (unless bypassed)
    if (!bypassCache && this.config.cache.enabled) {
      const cached = this.cacheManager.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Fetch from API with retry
    const abi = await this.fetchWithRetry(contractName, version, abiHash);

    return abi;
  }

  /**
   * Fetch ABI with retry logic
   * @param contractName - Contract name
   * @param version - Version
   * @param abiHash - ABI hash
   * @param attempt - Current attempt number
   * @returns ABI JSON
   */
  private async fetchWithRetry(
    contractName: string,
    version?: string,
    abiHash?: string,
    attempt: number = 1
  ): Promise<any> {
    try {
      // Fetch from API
      const abiItem = abiHash
        ? await this.apiClient.fetchABIByHash(abiHash)
        : await this.apiClient.fetchABIByName(contractName, version);

      // Validate ABI structure
      validateABI(abiItem.abi, contractName);

      // Cache the result
      if (this.config.cache.enabled) {
        const cacheKey = ABICacheManager.generateKey(
          contractName,
          abiItem.version,
          abiItem.abiHash
        );
        this.cacheManager.set(cacheKey, abiItem.abi, {
          contractName: abiItem.contractName || abiItem.name,
          version: abiItem.version,
          abiHash: abiItem.abiHash,
        });
      }

      logger.success(
        `✓ Loaded ABI: ${contractName} (v${abiItem.version}, hash: ${abiItem.abiHash.substring(0, 8)}...)`
      );

      return abiItem.abi;
    } catch (error) {
      // Don't retry on NOT_FOUND or validation errors
      if (error instanceof ABINotFoundError || error instanceof ABIValidationError) {
        throw error;
      }

      // Retry on API errors
      if (attempt < this.config.retry.maxRetries) {
        const backoff = this.config.retry.backoffMs * attempt;
        logger.warning(
          `Retry ${attempt}/${this.config.retry.maxRetries} for ${contractName} in ${backoff}ms...`
        );
        await this.sleep(backoff);
        return this.fetchWithRetry(contractName, version, abiHash, attempt + 1);
      }

      // Max retries exceeded
      throw error;
    }
  }

  /**
   * Prefetch multiple ABIs for performance
   * @param contractNames - Array of contract names to prefetch
   */
  async prefetchABIs(contractNames: string[]): Promise<void> {
    logger.info(`Prefetching ${contractNames.length} ABIs...`);

    try {
      const abiItems = await this.apiClient.fetchMultipleABIs(contractNames);

      for (const item of abiItems) {
        const contractName = item.contractName || item.name;
        const cacheKey = ABICacheManager.generateKey(
          contractName,
          item.version,
          item.abiHash
        );

        this.cacheManager.set(cacheKey, item.abi, {
          contractName,
          version: item.version,
          abiHash: item.abiHash,
        });
      }

      logger.success(`✓ Prefetched ${abiItems.length}/${contractNames.length} ABIs`);
    } catch (error) {
      logger.warning(
        `Prefetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      // Don't throw - prefetch is optional
    }
  }

  /**
   * Clear all cached ABIs
   */
  clearCache(): void {
    this.cacheManager.clear();
  }

  /**
   * Get cache statistics
   * @returns Cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return this.cacheManager.getStats();
  }

  /**
   * Sleep for specified milliseconds
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
