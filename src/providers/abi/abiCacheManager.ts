/**
 * ABI Cache Manager
 * In-memory cache with TTL support for ABI data
 */

import { CachedABI } from '@types';
import { logger } from '@utils';

/**
 * Manages in-memory caching of ABIs with TTL
 */
export class ABICacheManager {
  private cache: Map<string, CachedABI> = new Map();
  private readonly ttl: number;

  constructor(ttl: number = 5 * 60 * 1000) {
    this.ttl = ttl;
  }

  /**
   * Get ABI from cache
   * @param key - Cache key
   * @returns ABI if found and not expired, null otherwise
   */
  get(key: string): any | null {
    const cached = this.cache.get(key);

    if (!cached) {
      logger.debug(`Cache MISS: ${key}`);
      return null;
    }

    // Check expiration
    if (Date.now() > cached.metadata.expiresAt) {
      logger.debug(`Cache EXPIRED: ${key}`);
      this.cache.delete(key);
      return null;
    }

    logger.debug(`Cache HIT: ${key} (v${cached.metadata.version})`);
    return cached.abi;
  }

  /**
   * Set ABI in cache
   * @param key - Cache key
   * @param abi - ABI to cache
   * @param metadata - ABI metadata
   */
  set(
    key: string,
    abi: any,
    metadata: { contractName: string; version: string; abiHash: string }
  ): void {
    const now = Date.now();

    this.cache.set(key, {
      abi,
      metadata: {
        ...metadata,
        cachedAt: now,
        expiresAt: now + this.ttl,
      },
    });

    logger.debug(`Cache SET: ${key} (v${metadata.version}, expires in ${this.ttl}ms)`);
  }

  /**
   * Check if key exists in cache and is not expired
   * @param key - Cache key
   * @returns True if key exists and is valid
   */
  has(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;

    if (Date.now() > cached.metadata.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Invalidate a specific cache entry
   * @param key - Cache key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    logger.debug(`Cache INVALIDATED: ${key}`);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.debug(`Cache CLEARED: ${size} items removed`);
  }

  /**
   * Get cache statistics
   * @returns Cache stats
   */
  getStats(): { size: number; keys: string[] } {
    // Clean expired entries first
    this.cleanExpired();

    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Remove all expired entries
   */
  private cleanExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((value, key) => {
      if (now > value.metadata.expiresAt) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach((key) => this.cache.delete(key));

    if (expiredKeys.length > 0) {
      logger.debug(`Cleaned ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Generate cache key
   * @param contractName - Contract name
   * @param version - Optional version
   * @param abiHash - Optional ABI hash
   * @returns Cache key
   */
  static generateKey(contractName: string, version?: string, abiHash?: string): string {
    if (abiHash) {
      return `hash:${abiHash}`;
    }
    if (version && version !== 'latest') {
      return `${contractName}@${version}`;
    }
    return `${contractName}@latest`;
  }
}
