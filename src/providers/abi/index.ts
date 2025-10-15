/**
 * ABI Provider Factory
 * Creates appropriate ABI provider based on configuration
 */

export * from './ABIProvider.interface';
export * from './ManualABIProvider';
export * from './APIABIProvider';

import { IABIProvider, ABIProviderType } from '../../types';
import { ManualABIProvider } from './ManualABIProvider';
import { APIABIProvider } from './APIABIProvider';

/**
 * Factory function to create ABI provider
 * @param type - Type of ABI provider to create
 * @param config - Configuration for the provider
 * @returns ABI provider instance
 */
export function createABIProvider(
  type: ABIProviderType = 'manual',
  config?: { apiUrl?: string; abiDirectory?: string }
): IABIProvider {
  switch (type) {
    case 'manual':
      return new ManualABIProvider(config?.abiDirectory);

    case 'api':
      if (!config?.apiUrl) {
        throw new Error('API URL is required for API ABI provider');
      }
      return new APIABIProvider(config.apiUrl);

    default:
      throw new Error(`Unknown ABI provider type: ${type}`);
  }
}
