/**
 * ABI Provider Factory
 * Creates ABI provider from configuration
 */

export * from './ABIProvider.interface';
export * from './APIABIProvider';
export * from './abiApiClient';
export * from './abiCacheManager';

import { IABIProvider } from '@types';
import { APIABIProvider } from './APIABIProvider';
import { abiApiConfig, validateABIApiConfig } from '@config/abiApiConfig';
import { ABIConfigError } from '@/errors/abiProviderErrors';

/**
 * Create ABI provider from environment configuration
 * @returns ABI provider instance
 * @throws {ABIConfigError} if configuration is invalid
 */
export function createABIProvider(): IABIProvider {
  try {
    // Validate configuration
    validateABIApiConfig(abiApiConfig);

    // Create API provider
    return new APIABIProvider(abiApiConfig);
  } catch (error) {
    if (error instanceof Error) {
      throw new ABIConfigError(error.message);
    }
    throw new ABIConfigError('Failed to create ABI provider');
  }
}
