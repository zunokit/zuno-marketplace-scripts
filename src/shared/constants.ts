/**
 * Shared Constants
 */

/**
 * Time constants
 */
export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 60 * 60;
export const SECONDS_PER_DAY = 24 * 60 * 60;
export const SECONDS_PER_WEEK = 7 * 24 * 60 * 60;

/**
 * Convert days to seconds
 */
export function daysToSeconds(days: number): number {
  return days * SECONDS_PER_DAY;
}

/**
 * Convert hours to seconds
 */
export function hoursToSeconds(hours: number): number {
  return hours * SECONDS_PER_HOUR;
}

/**
 * Default values
 */
export const DEFAULT_LISTING_DURATION_DAYS = 7;
export const DEFAULT_AUCTION_DURATION_DAYS = 7;
export const DEFAULT_MINT_LIMIT_PER_WALLET = 1000;
export const DEFAULT_ROYALTY_FEE_BPS = 500; // 5%
