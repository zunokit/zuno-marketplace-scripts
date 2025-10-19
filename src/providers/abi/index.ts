/**
 * ABI Provider Factory
 * Creates ABI provider from configuration
 */

export * from './ABIProvider.interface';
export * from './APIABIProvider';
export * from './abi_api_client';
export * from './abi_cache_manager';

import { IABIProvider } from '@types';
import { APIABIProvider } from './APIABIProvider';
import { abiApiConfig, validateABIApiConfig } from '@config/abi_api_config';
import { ABIConfigError } from '@/errors/abi_provider_errors';

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
