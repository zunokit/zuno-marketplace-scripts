export interface ZunoApiConfig {
  baseUrl: string;
  apiKey: string;
  cacheTTL?: number;
}

export interface AbiItem {
  type: string;
  name?: string;
  inputs?: any[];
  outputs?: any[];
  stateMutability?: string;
  anonymous?: boolean;
}

export interface Deployment {
  network: string;
  address: string;
  verified: boolean;
  timestamp?: number;
}

export interface AbiData {
  id: string;
  name: string;
  contractName: string;
  abi: AbiItem[];
  deployments: Deployment[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AbiResponse {
  success: boolean;
  data: {
    data: AbiData[];
    pagination: PaginationInfo;
  };
}

export interface SingleAbiResponse {
  success: boolean;
  data: AbiData;
}

export interface Network {
  id: string;
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
}

export interface NetworkResponse {
  success: boolean;
  data: {
    data: Network[];
    pagination: PaginationInfo;
  };
}

export interface GetAbisParams {
  page?: number;
  limit?: number;
  search?: string;
  contractName?: string;
  network?: string;
}
