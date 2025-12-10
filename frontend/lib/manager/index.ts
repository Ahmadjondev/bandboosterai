/**
 * Manager Library Exports
 */

export { managerAPI } from './api-client';
export { authClient } from './auth-client';
export * from './utils';
export {
  errorLogger,
  logInfo,
  logWarn,
  logError,
  logCritical,
  logApiError,
  logValidationError,
  logUserAction,
} from './error-logger';
export type { LogEntry, ErrorSeverity, ErrorLoggerConfig } from './error-logger';
