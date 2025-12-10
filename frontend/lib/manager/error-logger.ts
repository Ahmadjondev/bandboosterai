/**
 * Error Logger Utility for Manager Panel
 * Centralized error logging system with console output and optional storage
 */

type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

interface LogEntry {
  timestamp: string;
  severity: ErrorSeverity;
  message: string;
  context?: string;
  details?: unknown;
  stack?: string;
}

interface ErrorLoggerConfig {
  maxLogs: number;
  enableConsole: boolean;
  enableStorage: boolean;
  storageKey: string;
}

const DEFAULT_CONFIG: ErrorLoggerConfig = {
  maxLogs: 100,
  enableConsole: true,
  enableStorage: true,
  storageKey: 'manager_error_logs',
};

class ErrorLogger {
  private config: ErrorLoggerConfig;
  private logs: LogEntry[] = [];
  private listeners: ((entry: LogEntry) => void)[] = [];

  constructor(config: Partial<ErrorLoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !this.config.enableStorage) return;

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch {
      this.logs = [];
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined' || !this.config.enableStorage) return;

    try {
      // Keep only the most recent logs
      const logsToSave = this.logs.slice(-this.config.maxLogs);
      localStorage.setItem(this.config.storageKey, JSON.stringify(logsToSave));
    } catch (e) {
      // Storage full or unavailable - silently fail
      console.warn('Failed to save error logs to storage:', e);
    }
  }

  private formatMessage(severity: ErrorSeverity, message: string, context?: string): string {
    const prefix = context ? `[${context}]` : '';
    return `${prefix} ${message}`.trim();
  }

  private createLogEntry(
    severity: ErrorSeverity,
    message: string,
    context?: string,
    details?: unknown,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      severity,
      message,
      context,
      details,
      stack: error?.stack,
    };
  }

  private log(
    severity: ErrorSeverity,
    message: string,
    context?: string,
    details?: unknown,
    error?: Error
  ): void {
    const entry = this.createLogEntry(severity, message, context, details, error);
    this.logs.push(entry);

    // Trim logs if necessary
    if (this.logs.length > this.config.maxLogs) {
      this.logs = this.logs.slice(-this.config.maxLogs);
    }

    // Console output
    if (this.config.enableConsole) {
      const formattedMessage = this.formatMessage(severity, message, context);
      switch (severity) {
        case 'info':
          console.info(`ℹ️ ${formattedMessage}`, details || '');
          break;
        case 'warning':
          console.warn(`⚠️ ${formattedMessage}`, details || '');
          break;
        case 'error':
          console.error(`❌ ${formattedMessage}`, details || '', error?.stack || '');
          break;
        case 'critical':
          console.error(`🚨 CRITICAL: ${formattedMessage}`, details || '', error?.stack || '');
          break;
      }
    }

    // Notify listeners
    this.listeners.forEach((listener) => listener(entry));

    // Save to storage
    this.saveToStorage();
  }

  /**
   * Log an informational message
   */
  info(message: string, context?: string, details?: unknown): void {
    this.log('info', message, context, details);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: string, details?: unknown): void {
    this.log('warning', message, context, details);
  }

  /**
   * Log an error message
   */
  error(message: string, context?: string, details?: unknown, error?: Error): void {
    this.log('error', message, context, details, error);
  }

  /**
   * Log a critical error message
   */
  critical(message: string, context?: string, details?: unknown, error?: Error): void {
    this.log('critical', message, context, details, error);
  }

  /**
   * Log an API error with request details
   */
  apiError(
    endpoint: string,
    method: string,
    statusCode: number | undefined,
    errorMessage: string,
    requestData?: unknown
  ): void {
    this.error(
      `API ${method} ${endpoint} failed: ${errorMessage}`,
      'API',
      {
        endpoint,
        method,
        statusCode,
        requestData,
      }
    );
  }

  /**
   * Log a validation error
   */
  validationError(fieldName: string, message: string, value?: unknown): void {
    this.warn(`Validation failed for ${fieldName}: ${message}`, 'Validation', { fieldName, value });
  }

  /**
   * Log user action for debugging
   */
  userAction(action: string, details?: unknown): void {
    this.info(`User action: ${action}`, 'UserAction', details);
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by severity
   */
  getLogsBySeverity(severity: ErrorSeverity): LogEntry[] {
    return this.logs.filter((log) => log.severity === severity);
  }

  /**
   * Get logs filtered by context
   */
  getLogsByContext(context: string): LogEntry[] {
    return this.logs.filter((log) => log.context === context);
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 10): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    this.saveToStorage();
  }

  /**
   * Export logs as JSON string
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Download logs as a file
   */
  downloadLogs(filename: string = 'error_logs.json'): void {
    if (typeof window === 'undefined') return;

    const blob = new Blob([this.exportLogs()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Add a listener for new log entries
   */
  addListener(listener: (entry: LogEntry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Wrap an async function with error logging
   */
  wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context: string
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      try {
        return await fn(...args);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.error(err.message, context, { args }, err);
        throw error;
      }
    };
  }
}

// Singleton instance
export const errorLogger = new ErrorLogger();

// Named exports for convenience
export const {
  info: logInfo,
  warn: logWarn,
  error: logError,
  critical: logCritical,
  apiError: logApiError,
  validationError: logValidationError,
  userAction: logUserAction,
} = errorLogger;

export type { LogEntry, ErrorSeverity, ErrorLoggerConfig };
