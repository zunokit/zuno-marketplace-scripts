/**
 * ABI API Configuration
 * Manages configuration for fetching ABIs from remote API
 */

export interface ABIApiConfig {
  baseUrl: string;
  apiKey: string;
  version: string; // 'latest' | '1.0.0' | etc.
  cache: {
    enabled: boolean;
    ttl: number; // milliseconds
  };
  retry: {
    maxRetries: number;
    backoffMs: number;
  };
  prefetch: {
    enabled: boolean;
    contracts: string[]; // Commonly used contracts
  };
}

/**
 * Load ABI API configuration from environment variables
 */
export const abiApiConfig: ABIApiConfig = {
  baseUrl: process.env.ABI_API_URL || '',
  apiKey: process.env.ABI_API_KEY || '',
  version: process.env.ABI_VERSION || '1.0.0',
  cache: {
    enabled: process.env.ABI_CACHE_ENABLED !== 'false',
    ttl: Number(process.env.ABI_CACHE_TTL) || 5 * 60 * 1000, // 5 minutes default
  },
  retry: {
    maxRetries: 3,
    backoffMs: 1000,
  },
  prefetch: {
    enabled: process.env.ABI_PREFETCH_ENABLED !== 'false',
    contracts: [
      'ERC721CollectionFactory',
      'ERC1155CollectionFactory',
      'ERC721Collection',
      'ERC1155Collection',
      'UserHub',
      'AdminHub',
      'ERC721NFTExchange',
      'ERC1155NFTExchange',
      'EnglishAuction',
      'DutchAuction',
      'OfferManager',
      'BundleManager',
    ],
  },
};

/**
 * Validate ABI API configuration
 * @throws {Error} if configuration is invalid
 */
export function validateABIApiConfig(config: ABIApiConfig): void {
  if (!config.baseUrl) {
    throw new Error(
      'ABI_API_URL is required in .env file. Please set the ABI API base URL.'
    );
  }

  if (!config.apiKey) {
    throw new Error(
      'ABI_API_KEY is required in .env file. Please set your ABI API key.'
    );
  }

  // Validate URL format
  try {
    new URL(config.baseUrl);
  } catch {
    throw new Error(
      `Invalid ABI_API_URL format: ${config.baseUrl}. Must be a valid URL.`
    );
  }

  // Validate cache TTL
  if (config.cache.ttl < 0) {
    throw new Error('ABI_CACHE_TTL must be a positive number');
  }

  // Validate retry config
  if (config.retry.maxRetries < 0 || config.retry.maxRetries > 10) {
    throw new Error('Retry maxRetries must be between 0 and 10');
  }

  if (config.retry.backoffMs < 0) {
    throw new Error('Retry backoffMs must be a positive number');
  }
}
