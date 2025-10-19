/**
 * Validation Utilities
 * Input validation helpers
 */

import { ethers } from 'ethers';

/**
 * Validates Ethereum address
 * @param address - Address to validate
 * @param fieldName - Field name for error message
 * @throws {Error} If address is invalid
 */
export function validateAddress(address: string, fieldName: string = 'Address'): void {
  if (!address || !ethers.isAddress(address)) {
    throw new Error(`${fieldName} is invalid: ${address}`);
  }
}

/**
 * Validates positive number
 * @param value - Value to validate
 * @param fieldName - Field name for error message
 * @throws {Error} If value is not positive
 */
export function validatePositiveNumber(value: number, fieldName: string = 'Value'): void {
  if (isNaN(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive number: ${value}`);
  }
}

/**
 * Validates non-negative number
 * @param value - Value to validate
 * @param fieldName - Field name for error message
 * @throws {Error} If value is negative
 */
export function validateNonNegativeNumber(value: number, fieldName: string = 'Value'): void {
  if (isNaN(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative number: ${value}`);
  }
}

/**
 * Validates integer
 * @param value - Value to validate
 * @param fieldName - Field name for error message
 * @throws {Error} If value is not an integer
 */
export function validateInteger(value: number, fieldName: string = 'Value'): void {
  if (isNaN(value) || !Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer: ${value}`);
  }
}

/**
 * Validates string is not empty
 * @param value - Value to validate
 * @param fieldName - Field name for error message
 * @throws {Error} If string is empty
 */
export function validateNonEmptyString(value: string, fieldName: string = 'Value'): void {
  if (!value || value.trim().length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }
}

/**
 * Validates percentage (0-100)
 * @param value - Value to validate
 * @param fieldName - Field name for error message
 * @throws {Error} If value is not a valid percentage
 */
export function validatePercentage(value: number, fieldName: string = 'Percentage'): void {
  if (isNaN(value) || value < 0 || value > 100) {
    throw new Error(`${fieldName} must be between 0 and 100: ${value}`);
  }
}

/**
 * Validates basis points (0-10000)
 * @param value - Value to validate
 * @param fieldName - Field name for error message
 * @throws {Error} If value is not valid basis points
 */
export function validateBasisPoints(value: number, fieldName: string = 'Basis Points'): void {
  if (isNaN(value) || value < 0 || value > 10000) {
    throw new Error(`${fieldName} must be between 0 and 10000: ${value}`);
  }
}

/**
 * Validates ETH amount string
 * @param value - Value to validate
 * @param fieldName - Field name for error message
 * @throws {Error} If value is invalid ETH amount
 */
export function validateETHAmount(value: string, fieldName: string = 'Amount'): void {
  try {
    const parsed = ethers.parseEther(value);
    if (parsed < 0n) {
      throw new Error(`${fieldName} cannot be negative`);
    }
  } catch (error) {
    throw new Error(
      `${fieldName} is invalid: ${value}. ${error instanceof Error ? error.message : ''}`
    );
  }
}

/**
 * Validates array is not empty
 * @param array - Array to validate
 * @param fieldName - Field name for error message
 * @throws {Error} If array is empty
 */
export function validateNonEmptyArray<T>(array: T[], fieldName: string = 'Array'): void {
  if (!array || array.length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }
}

/**
 * Validates choice is in allowed values
 * @param value - Value to validate
 * @param allowedValues - Allowed values
 * @param fieldName - Field name for error message
 * @throws {Error} If value is not allowed
 */
export function validateChoice<T>(
  value: T,
  allowedValues: T[],
  fieldName: string = 'Value'
): void {
  if (!allowedValues.includes(value)) {
    throw new Error(
      `${fieldName} must be one of: ${allowedValues.join(', ')}. Got: ${value}`
    );
  }
}
