/**
 * NFT Utilities
 * Helper functions for NFT operations
 */

import { ethers } from 'ethers';
import { NFTStandard, NFTInfo } from '../types';

/**
 * Detects NFT standard (ERC721 or ERC1155)
 * @param contract - NFT contract instance
 * @param tokenId - Token ID to check
 * @returns NFT standard
 */
export async function detectNFTStandard(
  contract: ethers.Contract,
  tokenId: string | number
): Promise<NFTStandard> {
  try {
    // Try ERC165 interface detection
    const isERC721 = await contract.supportsInterface!('0x80ac58cd');
    if (isERC721) return 'ERC721';

    const isERC1155 = await contract.supportsInterface!('0xd9b67a26');
    if (isERC1155) return 'ERC1155';
  } catch {
    // Fallback: try ERC721-specific function
    try {
      await contract.ownerOf!(tokenId);
      return 'ERC721';
    } catch {
      return 'ERC1155';
    }
  }

  throw new Error('Unable to detect NFT standard');
}

/**
 * Gets NFT information
 * @param contract - NFT contract instance
 * @param tokenId - Token ID
 * @param ownerAddress - Owner address to check
 * @returns NFT information
 */
export async function getNFTInfo(
  contract: ethers.Contract,
  tokenId: string | number,
  ownerAddress: string
): Promise<NFTInfo> {
  const standard = await detectNFTStandard(contract, tokenId);
  const address = await contract.getAddress();

  if (standard === 'ERC721') {
    const owner = await contract.ownerOf!(tokenId);
    return {
      address,
      tokenId,
      standard,
      owner,
    };
  } else {
    const balance = await contract.balanceOf!(ownerAddress, tokenId);
    return {
      address,
      tokenId,
      standard,
      balance,
    };
  }
}

/**
 * Checks NFT ownership
 * @param contract - NFT contract instance
 * @param tokenId - Token ID
 * @param ownerAddress - Address to check
 * @param amount - Amount for ERC1155
 * @returns True if owner has the NFT
 */
export async function checkOwnership(
  contract: ethers.Contract,
  tokenId: string | number,
  ownerAddress: string,
  amount?: number
): Promise<boolean> {
  const standard = await detectNFTStandard(contract, tokenId);

  if (standard === 'ERC721') {
    const owner = await contract.ownerOf!(tokenId);
    return owner.toLowerCase() === ownerAddress.toLowerCase();
  } else {
    const balance = await contract.balanceOf!(ownerAddress, tokenId);
    if (amount) {
      return balance >= BigInt(amount);
    }
    return balance > 0n;
  }
}

/**
 * Checks approval status
 * @param contract - NFT contract instance
 * @param ownerAddress - Owner address
 * @param operatorAddress - Operator address
 * @param tokenId - Token ID (for ERC721 specific approval)
 * @returns True if approved
 */
export async function checkApproval(
  contract: ethers.Contract,
  ownerAddress: string,
  operatorAddress: string,
  tokenId?: string | number
): Promise<boolean> {
  try {
    // For ERC721, check both specific token approval and operator approval
    if (tokenId !== undefined) {
      try {
        const approved = await contract.getApproved!(tokenId);
        if (approved.toLowerCase() === operatorAddress.toLowerCase()) {
          return true;
        }
      } catch {
        // getApproved not available or failed
      }
    }

    // Check operator approval (works for both ERC721 and ERC1155)
    return await contract.isApprovedForAll!(ownerAddress, operatorAddress);
  } catch (error) {
    throw new Error(
      `Failed to check approval: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Approves operator for NFT
 * @param contract - NFT contract instance
 * @param operatorAddress - Operator address
 * @param tokenId - Token ID (for ERC721 specific approval)
 * @returns Transaction response
 */
export async function approveOperator(
  contract: ethers.Contract,
  operatorAddress: string,
  tokenId?: string | number
): Promise<ethers.ContractTransactionResponse> {
  if (tokenId !== undefined) {
    // ERC721 specific approval
    try {
      return await contract.approve!(operatorAddress, tokenId);
    } catch {
      // Fall back to setApprovalForAll
    }
  }

  // Operator approval (works for both standards)
  return await contract.setApprovalForAll!(operatorAddress, true);
}

/**
 * Creates a generic NFT contract instance
 * @param address - Contract address
 * @param signerOrProvider - Signer or provider
 * @returns Contract instance
 */
export function createNFTContract(
  address: string,
  signerOrProvider: ethers.Signer | ethers.Provider
): ethers.Contract {
  const abi = [
    'function supportsInterface(bytes4) view returns (bool)',
    'function ownerOf(uint256) view returns (address)',
    'function balanceOf(address,uint256) view returns (uint256)',
    'function balanceOf(address) view returns (uint256)',
    'function isApprovedForAll(address,address) view returns (bool)',
    'function setApprovalForAll(address,bool)',
    'function approve(address,uint256)',
    'function getApproved(uint256) view returns (address)',
    'function name() view returns (string)',
    'function symbol() view returns (string)',
  ];

  return new ethers.Contract(address, abi, signerOrProvider);
}
