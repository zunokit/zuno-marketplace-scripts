/**
 * ABI Validation Utilities
 * Validates ABI structure and required functions
 */

import { ABIValidationError } from '@/errors/abiProviderErrors';

/**
 * Validates that an ABI has proper structure
 * @param abi - ABI to validate
 * @param contractName - Contract name for error messaging
 * @throws {ABIValidationError} If ABI is invalid
 */
export function validateABI(abi: unknown, contractName: string): void {
  // Check not empty
  if (!abi) {
    throw new ABIValidationError(contractName, 'ABI is null or undefined');
  }

  // Check is array
  if (!Array.isArray(abi)) {
    throw new ABIValidationError(contractName, 'ABI must be an array');
  }

  // Check not empty array
  if (abi.length === 0) {
    throw new ABIValidationError(contractName, 'ABI array is empty');
  }

  // Validate structure (each item should have type field)
  const invalidItems = abi.filter((item: any) => !item.type);
  if (invalidItems.length > 0) {
    throw new ABIValidationError(
      contractName,
      `Found ${invalidItems.length} ABI items without 'type' field`
    );
  }
}

/**
 * Check if ABI has a specific function
 * @param abi - ABI array
 * @param functionName - Function name to check
 * @returns True if function exists
 */
export function hasFunction(abi: any[], functionName: string): boolean {
  return abi.some(
    (item: any) => item.type === 'function' && item.name === functionName
  );
}

/**
 * Check if ABI has a specific event
 * @param abi - ABI array
 * @param eventName - Event name to check
 * @returns True if event exists
 */
export function hasEvent(abi: any[], eventName: string): boolean {
  return abi.some(
    (item: any) => item.type === 'event' && item.name === eventName
  );
}

/**
 * Validate that ABI has required functions
 * @param abi - ABI array
 * @param contractName - Contract name for error messaging
 * @param requiredFunctions - Array of required function names
 * @throws {ABIValidationError} If required functions are missing
 */
export function validateRequiredFunctions(
  abi: any[],
  contractName: string,
  requiredFunctions: string[]
): void {
  const missing = requiredFunctions.filter((fn) => !hasFunction(abi, fn));

  if (missing.length > 0) {
    throw new ABIValidationError(
      contractName,
      `Missing required functions: ${missing.join(', ')}`
    );
  }
}

/**
 * Validate that ABI has required events
 * @param abi - ABI array
 * @param contractName - Contract name for error messaging
 * @param requiredEvents - Array of required event names
 * @throws {ABIValidationError} If required events are missing
 */
export function validateRequiredEvents(
  abi: any[],
  contractName: string,
  requiredEvents: string[]
): void {
  const missing = requiredEvents.filter((event) => !hasEvent(abi, event));

  if (missing.length > 0) {
    throw new ABIValidationError(
      contractName,
      `Missing required events: ${missing.join(', ')}`
    );
  }
}

/**
 * Get all function names from ABI
 * @param abi - ABI array
 * @returns Array of function names
 */
export function getFunctionNames(abi: any[]): string[] {
  return abi
    .filter((item: any) => item.type === 'function')
    .map((item: any) => item.name);
}

/**
 * Get all event names from ABI
 * @param abi - ABI array
 * @returns Array of event names
 */
export function getEventNames(abi: any[]): string[] {
  return abi
    .filter((item: any) => item.type === 'event')
    .map((item: any) => item.name);
}
