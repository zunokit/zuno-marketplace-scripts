/**
 * ABI API Client
 * Handles HTTP communication with ABI API
 */

import { ABIApiResponse, ABIItemDto } from '@types';
import { ABIApiError, ABINotFoundError } from '@/errors/abiProviderErrors';
import { logger } from '@utils';

export interface QueryParams {
  contractName?: string;
  name?: string;
  version?: string;
  abiHash?: string;
  page?: number;
  limit?: number;
  tags?: string[];
}

export interface ContractQueryParams {
  networkId?: string;
  type?: string;
  name?: string;
  address?: string;
  page?: number;
  limit?: number;
}

export interface ContractResponseDto {
  id: string;
  address: string;
  networkId: string;
  abiId: string;
  name: string | null;
  type: string | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContractsApiResponse {
  success: boolean;
  data: {
    data: ContractResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  meta: {
    timestamp: string;
    version: string;
  };
}

export interface NetworkDto {
  id: string;
  name: string;
  slug: string;
  chainId: number;
  type: string;
  isTestnet: boolean;
  isActive: boolean;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface NetworksApiResponse {
  success: boolean;
  data: {
    data: NetworkDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  meta: {
    timestamp: string;
    version: string;
  };
}

/**
 * HTTP client for ABI API
 * Handles requests, authentication, and error handling
 */
export class ABIApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string
  ) {}

  /**
   * Fetch ABIs with query parameters
   * @param params - Query parameters
   * @returns API response with ABIs
   */
  async fetchABIs(params: QueryParams): Promise<ABIApiResponse> {
    const url = this.buildUrl('/api/abis/full', params);

    logger.debug(`Fetching ABIs from: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      const data = (await response.json()) as ABIApiResponse;

      if (!data.success) {
        throw new ABIApiError('API returned success: false');
      }

      logger.debug(`Fetched ${data.data.data.length} ABIs`);

      return data;
    } catch (error) {
      if (error instanceof ABIApiError) {
        throw error;
      }
      throw new ABIApiError(
        `Failed to fetch ABIs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        error as Error
      );
    }
  }

  /**
   * Fetch ABI by contract name
   * @param contractName - Contract name
   * @param version - Optional version (defaults to latest)
   * @returns ABI item
   */
  async fetchABIByName(contractName: string, version?: string): Promise<ABIItemDto> {
    const params: QueryParams = {
      contractName,
      limit: 1,
    };

    // If version is specified and not 'latest', add to query
    if (version && version !== 'latest') {
      params.version = version;
    }

    const response = await this.fetchABIs(params);

    if (response.data.data.length === 0) {
      throw new ABINotFoundError(
        version ? `${contractName}@${version}` : contractName
      );
    }

    const abiItem = response.data.data[0];
    if (!abiItem) {
      throw new ABINotFoundError(contractName);
    }

    return abiItem;
  }

  /**
   * Fetch ABI by hash
   * @param abiHash - ABI hash
   * @returns ABI item
   */
  async fetchABIByHash(abiHash: string): Promise<ABIItemDto> {
    const response = await this.fetchABIs({ abiHash, limit: 1 });

    if (response.data.data.length === 0) {
      throw new ABINotFoundError(`hash:${abiHash}`);
    }

    const abiItem = response.data.data[0];
    if (!abiItem) {
      throw new ABINotFoundError(`hash:${abiHash}`);
    }

    return abiItem;
  }

  /**
   * Fetch multiple ABIs for batch prefetch
   * @param contractNames - Array of contract names
   * @returns Array of ABI items
   */
  async fetchMultipleABIs(contractNames: string[]): Promise<ABIItemDto[]> {
    // Fetch all ABIs (up to 100)
    const response = await this.fetchABIs({
      limit: 100,
    });

    // Filter by contract names
    return response.data.data.filter((item) =>
      contractNames.includes(item.contractName || item.name)
    );
  }

  /**
   * Fetch contracts by network and type
   * @param params - Query parameters
   * @returns Contracts API response
   */
  async fetchContracts(params: ContractQueryParams): Promise<ContractsApiResponse> {
    const url = this.buildUrl('/api/contracts', params as any);

    logger.debug(`Fetching contracts from: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      const data = (await response.json()) as ContractsApiResponse;

      if (!data.success) {
        throw new ABIApiError('API returned success: false');
      }

      logger.debug(`Fetched ${data.data.data.length} contracts`);

      return data;
    } catch (error) {
      if (error instanceof ABIApiError) {
        throw error;
      }
      throw new ABIApiError(
        `Failed to fetch contracts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        error as Error
      );
    }
  }

  /**
   * Fetch deployed contracts for a specific network
   * @param networkId - Network ID from API (e.g., net_v1_SVhnLQWuf0RE)
   * @returns Map of contract name to address
   */
  async fetchDeployedContracts(networkId: string): Promise<Map<string, string>> {
    const response = await this.fetchContracts({
      networkId,
      limit: 100,
    });

    const addressMap = new Map<string, string>();

    response.data.data.forEach((contract) => {
      // Use name field instead of type (type is null in API)
      if (contract.name) {
        addressMap.set(contract.name, contract.address);
      }
    });

    logger.debug(`Fetched ${addressMap.size} contracts for network ${networkId}`);

    return addressMap;
  }

  /**
   * Fetch all active networks
   * @returns Networks API response
   */
  async fetchNetworks(): Promise<NetworksApiResponse> {
    const url = this.buildUrl('/api/networks', { isActive: 'true', limit: 100 } as any);

    logger.debug(`Fetching networks from: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      const data = (await response.json()) as NetworksApiResponse;

      if (!data.success) {
        throw new ABIApiError('API returned success: false');
      }

      logger.debug(`Fetched ${data.data.data.length} networks`);

      return data;
    } catch (error) {
      if (error instanceof ABIApiError) {
        throw error;
      }
      throw new ABIApiError(
        `Failed to fetch networks: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        error as Error
      );
    }
  }

  /**
   * Build URL with query parameters
   * @param path - API path
   * @param params - Query parameters
   * @returns Full URL
   */
  private buildUrl(path: string, params?: QueryParams): string {
    const url = new URL(path, this.baseUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((v) => url.searchParams.append(key, String(v)));
          } else {
            url.searchParams.set(key, String(value));
          }
        }
      });
    }

    return url.toString();
  }

  /**
   * Handle HTTP error responses
   * @param response - Failed response
   * @returns Appropriate error
   */
  private async handleErrorResponse(response: Response): Promise<ABIApiError> {
    let errorMessage = response.statusText;

    try {
      const errorData = (await response.json()) as any;
      errorMessage = errorData?.message || errorData?.error || errorMessage;
    } catch {
      // Ignore JSON parse errors
    }

    switch (response.status) {
      case 401:
        return new ABIApiError('Invalid API key. Please check ABI_API_KEY in .env', 401);
      case 404:
        return new ABIApiError('ABI not found', 404);
      case 429:
        return new ABIApiError('Rate limit exceeded. Please try again later', 429);
      case 500:
      case 502:
      case 503:
        return new ABIApiError(`Server error: ${errorMessage}`, response.status);
      default:
        return new ABIApiError(errorMessage, response.status);
    }
  }
}
