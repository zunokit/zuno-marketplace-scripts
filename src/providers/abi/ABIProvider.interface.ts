/**
 * ABI Provider Interface
 * Defines the contract for ABI providers using Strategy Pattern
 */

import { ethers } from 'ethers';
import { IABIProvider, ABIFetchOptions } from '@types';

/**
 * Abstract base class for ABI providers
 * Implements Strategy Pattern for flexible ABI sourcing
 */
export abstract class ABIProviderBase implements IABIProvider {
  /**
   * Get ABI for a contract
   * @param contractName - Name of the contract
   * @param options - Optional fetch options (version, hash, cache bypass)
   * @returns Contract ABI
   */
  abstract getABI(contractName: string, options?: ABIFetchOptions): Promise<any>;

  /**
   * Get ethers Interface for a contract
   * @param contractName - Name of the contract
   * @returns Ethers contract interface
   */
  async getContractInterface(contractName: string): Promise<ethers.Interface> {
    const abi = await this.getABI(contractName);
    return new ethers.Interface(abi);
  }

  /**
   * Validates that an ABI is not empty
   * @param abi - ABI to validate
   * @param contractName - Contract name for error messaging
   * @throws {Error} If ABI is invalid
   */
  protected validateABI(abi: any, contractName: string): void {
    if (!abi || (Array.isArray(abi) && abi.length === 0)) {
      throw new Error(`Invalid or empty ABI for contract: ${contractName}`);
    }
  }
}
