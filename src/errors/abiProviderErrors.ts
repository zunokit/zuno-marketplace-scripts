/**
 * ABI Provider Error Classes
 * Custom error types for ABI fetching and validation
 */

/**
 * Base error for all ABI provider related errors
 */
export class ABIProviderError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ABIProviderError';

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when ABI is not found
 */
export class ABINotFoundError extends ABIProviderError {
  constructor(contractName: string, cause?: Error) {
    super(`ABI not found for contract: ${contractName}`, cause);
    this.name = 'ABINotFoundError';
  }
}

/**
 * Error thrown when ABI API request fails
 */
export class ABIApiError extends ABIProviderError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    cause?: Error
  ) {
    super(`ABI API Error: ${message}`, cause);
    this.name = 'ABIApiError';
  }
}

/**
 * Error thrown when ABI validation fails
 */
export class ABIValidationError extends ABIProviderError {
  constructor(contractName: string, reason: string, cause?: Error) {
    super(`ABI validation failed for ${contractName}: ${reason}`, cause);
    this.name = 'ABIValidationError';
  }
}

/**
 * Error thrown when ABI configuration is invalid
 */
export class ABIConfigError extends ABIProviderError {
  constructor(message: string) {
    super(`ABI Configuration Error: ${message}`);
    this.name = 'ABIConfigError';
  }
}

/**
 * Error thrown when cache operation fails
 */
export class ABICacheError extends ABIProviderError {
  constructor(message: string, cause?: Error) {
    super(`ABI Cache Error: ${message}`, cause);
    this.name = 'ABICacheError';
  }
}
