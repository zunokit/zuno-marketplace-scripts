/**
 * Network Configuration
 * Manages network settings and validates environment variables
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { NetworkConfig, NetworkName } from '../types';

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Network configuration mapping
 */
export const NETWORK_CONFIG: Record<NetworkName, NetworkConfig> = {
  local: {
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL_LOCAL || 'http://127.0.0.1:8545',
    hubAddress: process.env.NEXT_PUBLIC_USER_HUB_LOCAL || '',
    chainId: 31337,
  },
  sepolia: {
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA || '',
    hubAddress: process.env.NEXT_PUBLIC_USER_HUB_SEPOLIA || '',
    chainId: 11155111,
  },
  mainnet: {
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL_MAINNET || '',
    hubAddress: process.env.NEXT_PUBLIC_USER_HUB_MAINNET || '',
    chainId: 1,
  },
};

/**
 * Default network for operations
 */
export const DEFAULT_NETWORK: NetworkName = 'local';

/**
 * Validates network configuration
 * @param network - Network name to validate
 * @throws {Error} If configuration is invalid
 */
export function validateNetworkConfig(network: NetworkName): NetworkConfig {
  const config = NETWORK_CONFIG[network];

  if (!config) {
    throw new Error(`Unknown network: ${network}`);
  }

  if (!config.hubAddress) {
    throw new Error(
      `Hub address not configured for ${network}. ` +
      `Please set NEXT_PUBLIC_USER_HUB_${network.toUpperCase()} in .env`
    );
  }

  if (!config.rpcUrl) {
    throw new Error(
      `RPC URL not configured for ${network}. ` +
      `Please set NEXT_PUBLIC_RPC_URL_${network.toUpperCase()} in .env`
    );
  }

  return config;
}

/**
 * Gets network configuration by name
 * @param network - Network name
 * @returns Network configuration
 */
export function getNetworkConfig(network: NetworkName = DEFAULT_NETWORK): NetworkConfig {
  return validateNetworkConfig(network);
}

/**
 * Lists all available networks
 * @returns Array of network names
 */
export function getAvailableNetworks(): NetworkName[] {
  return Object.keys(NETWORK_CONFIG) as NetworkName[];
}
