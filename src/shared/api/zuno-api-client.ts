import {
  ZunoApiConfig,
  AbiData,
  Network,
  GetAbisParams,
  AbiResponse,
  SingleAbiResponse,
  NetworkResponse,
} from '../types/api.types';

export class ZunoApiClient {
  private baseUrl: string;
  private apiKey: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL: number;

  constructor(config: ZunoApiConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.cacheTTL = config.cacheTTL || 5 * 60 * 1000; // Default 5 minutes
  }

  private async request<T>(endpoint: string, params?: any): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);

    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, String(params[key]));
        }
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  private getCacheKey(endpoint: string, params?: any): string {
    return `${endpoint}:${JSON.stringify(params || {})}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async getAbis(params?: GetAbisParams): Promise<{ data: AbiData[]; pagination: any }> {
    const cacheKey = this.getCacheKey('/api/abis/full', params);
    const cached = this.getFromCache<{ data: AbiData[]; pagination: any }>(cacheKey);
    if (cached) return cached;

    const response = await this.request<AbiResponse>('/api/abis/full', params);
    const result = response.data;
    this.setCache(cacheKey, result);
    return result;
  }

  async getAbiByContractName(contractName: string): Promise<AbiData> {
    const cacheKey = this.getCacheKey('/api/abis/full', { contractName });
    const cached = this.getFromCache<AbiData>(cacheKey);
    if (cached) return cached;

    const response = await this.request<AbiResponse>('/api/abis/full', {
      contractName,
      limit: 1,
    });

    if (!response.success || response.data.data.length === 0) {
      throw new Error(`ABI not found for contract: ${contractName}`);
    }

    const result = response.data.data[0];
    if (!result) {
      throw new Error(`ABI not found for contract: ${contractName}`);
    }

    this.setCache(cacheKey, result);
    return result;
  }

  async getAbiByNetworkAndAddress(network: string, address: string): Promise<AbiData> {
    const cacheKey = this.getCacheKey('/api/abis/by-address', { network, address });
    const cached = this.getFromCache<AbiData>(cacheKey);
    if (cached) return cached;

    const response = await this.request<SingleAbiResponse>('/api/abis/by-address', {
      network,
      address,
    });

    if (!response.success) {
      throw new Error(`ABI not found for ${network}:${address}`);
    }

    const result = response.data;
    this.setCache(cacheKey, result);
    return result;
  }

  async getNetworks(): Promise<Network[]> {
    const cacheKey = this.getCacheKey('/api/networks');
    const cached = this.getFromCache<Network[]>(cacheKey);
    if (cached) return cached;

    const response = await this.request<NetworkResponse>('/api/networks');
    const result = response.data.data;
    this.setCache(cacheKey, result);
    return result;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
