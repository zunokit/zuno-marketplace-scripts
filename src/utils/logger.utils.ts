/**
 * Logger Utilities
 * Consistent logging helpers
 */

/**
 * Log levels
 */
export enum LogLevel {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  DEBUG = 'debug',
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  enableDebug: boolean;
  enableColors: boolean;
}

const config: LoggerConfig = {
  enableDebug: process.env.DEBUG === 'true',
  enableColors: true,
};

/**
 * Logs a message with optional formatting
 * @param level - Log level
 * @param message - Message to log
 * @param data - Optional data to log
 */
function log(level: LogLevel, message: string, data?: any): void {
  const prefix = getPrefix(level);

  console.log(`${prefix} ${message}`);

  if (data !== undefined) {
    console.log(data);
  }
}

/**
 * Gets prefix for log level
 * @param level - Log level
 * @returns Formatted prefix
 */
function getPrefix(level: LogLevel): string {
  switch (level) {
    case LogLevel.INFO:
      return '📝';
    case LogLevel.SUCCESS:
      return '✅';
    case LogLevel.WARNING:
      return '⚠️';
    case LogLevel.ERROR:
      return '❌';
    case LogLevel.DEBUG:
      return '🔍';
    default:
      return '•';
  }
}

/**
 * Logger functions
 */
export const logger = {
  info: (message: string, data?: any) => log(LogLevel.INFO, message, data),
  success: (message: string, data?: any) => log(LogLevel.SUCCESS, message, data),
  warning: (message: string, data?: any) => log(LogLevel.WARNING, message, data),
  error: (message: string, data?: any) => log(LogLevel.ERROR, message, data),
  debug: (message: string, data?: any) => {
    if (config.enableDebug) {
      log(LogLevel.DEBUG, message, data);
    }
  },

  section: (title: string) => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(title);
    console.log(`${'='.repeat(50)}\n`);
  },

  subsection: (title: string) => {
    console.log(`\n${title}`);
    console.log(`${'-'.repeat(40)}\n`);
  },

  divider: () => {
    console.log(`${'-'.repeat(50)}`);
  },

  space: () => {
    console.log('');
  },
};

/**
 * Formats a table for display
 * @param data - Data to display
 * @param headers - Table headers
 */
export function formatTable(data: Record<string, any>[]): void {
  if (data.length === 0) {
    console.log('No data to display');
    return;
  }

  console.table(data);
}

/**
 * Formats key-value pairs
 * @param data - Data to display
 * @param indent - Indentation level
 */
export function formatKeyValue(data: Record<string, any>, indent: number = 3): void {
  const spaces = ' '.repeat(indent);

  Object.entries(data).forEach(([key, value]) => {
    console.log(`${spaces}${key}:`, value);
  });
}
