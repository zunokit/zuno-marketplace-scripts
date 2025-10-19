/**
 * Network Configuration
 * Networks are fetched from ABI API and mapped to NetworkName
 */

import { NetworkConfig, NetworkName } from '@types';
import { ABIApiClient, NetworkDto } from '@/providers/abi/abiApiClient';
import { abiApiConfig, validateABIApiConfig } from '@config/abiApiConfig';
import { logger } from '@utils';

/**
 * Mapping from API network slug to our NetworkName
 */
const NETWORK_SLUG_MAP: Record<string, NetworkName> = {
  anvil: 'local',
  local: 'local',
  sepolia: 'sepolia',
  mainnet: 'mainnet',
  ethereum: 'mainnet',
};

/**
 * Cache for network configurations
 */
let networkConfigCache: Record<NetworkName, NetworkConfig> | null = null;

/**
 * Default network for operations
 */
export const DEFAULT_NETWORK: NetworkName = 'local';

/**
 * Fetch and build network configurations from API
 * @returns Network configuration mapping
 */
async function fetchNetworkConfigs(): Promise<Record<NetworkName, NetworkConfig>> {
  // Return cache if available
  if (networkConfigCache) {
    return networkConfigCache;
  }

  try {
    // Validate API config
    validateABIApiConfig(abiApiConfig);

    // Create API client
    const apiClient = new ABIApiClient(abiApiConfig.baseUrl, abiApiConfig.apiKey);

    logger.debug('Fetching network configurations from API...');

    // Fetch networks
    const response = await apiClient.fetchNetworks();
    const networks = response.data.data;

    // Build config map
    const configMap: Partial<Record<NetworkName, NetworkConfig>> = {};

    networks.forEach((network: NetworkDto) => {
      const networkName = NETWORK_SLUG_MAP[network.slug];
      if (networkName) {
        configMap[networkName] = {
          id: network.id, // Save network ID for contract fetching
          rpcUrl: 'http://127.0.0.1:8545', // Default to local RPC, will be set per network
          chainId: network.chainId,
        };
      }
    });

    // Set default RPC URLs (hardcoded for now, can be overridden)
    if (configMap.local) {
      configMap.local.rpcUrl = 'http://127.0.0.1:8545';
    }
    if (configMap.sepolia) {
      configMap.sepolia.rpcUrl = 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY';
    }
    if (configMap.mainnet) {
      configMap.mainnet.rpcUrl = 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY';
    }

    logger.success(`✓ Loaded ${Object.keys(configMap).length} network configurations`);

    // Cache and return
    networkConfigCache = configMap as Record<NetworkName, NetworkConfig>;
    return networkConfigCache;
  } catch (error) {
    throw new Error(
      `Failed to fetch network configurations: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Gets network configuration by name
 * @param network - Network name
 * @returns Network configuration
 */
export async function getNetworkConfig(
  network: NetworkName = DEFAULT_NETWORK
): Promise<NetworkConfig> {
  const configs = await fetchNetworkConfigs();
  const config = configs[network];

  if (!config) {
    throw new Error(`Network not found: ${network}`);
  }

  if (config.rpcUrl.includes('YOUR_INFURA_KEY')) {
    throw new Error(
      `RPC URL not configured for ${network}. ` +
        `Please update the RPC URL in src/config/network.config.ts`
    );
  }

  return config;
}

/**
 * Lists all available networks
 * @returns Array of network names
 */
export async function getAvailableNetworks(): Promise<NetworkName[]> {
  const configs = await fetchNetworkConfigs();
  return Object.keys(configs) as NetworkName[];
}
