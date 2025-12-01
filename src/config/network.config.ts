/**
 * Network Configuration
 */

import { NetworkConfig, NetworkName } from '@types';

/**
 * Network configurations
 */
const NETWORK_CONFIGS: Record<NetworkName, NetworkConfig> = {
  local: {
    rpcUrl: process.env.LOCAL_RPC_URL || 'http://127.0.0.1:8545',
    chainId: 31337,
  },
  sepolia: {
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_KEY',
    chainId: 11155111,
  },
  mainnet: {
    rpcUrl: process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_KEY',
    chainId: 1,
  },
};

/**
 * Default network for operations
 */
export const DEFAULT_NETWORK: NetworkName = 'local';

/**
 * Gets network configuration by name
 */
export async function getNetworkConfig(network: NetworkName = DEFAULT_NETWORK): Promise<NetworkConfig> {
  const config = NETWORK_CONFIGS[network];
  if (!config) {
    throw new Error(`Network not found: ${network}`);
  }
  return config;
}

/**
 * Lists all available networks
 */
export async function getAvailableNetworks(): Promise<NetworkName[]> {
  return Object.keys(NETWORK_CONFIGS) as NetworkName[];
}
