/**
 * Error Log Viewer Component
 * Displays and manages error logs from the error logger
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  XCircle,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { errorLogger, type LogEntry, type ErrorSeverity } from '@/lib/manager/error-logger';

interface ErrorLogViewerProps {
  maxHeight?: string;
  showControls?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const SEVERITY_CONFIG: Record<
  ErrorSeverity,
  {
    icon: React.ComponentType<{ className?: string }>;
    bgColor: string;
    textColor: string;
    borderColor: string;
    label: string;
  }
> = {
  info: {
    icon: Info,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    textColor: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-200 dark:border-blue-800',
    label: 'Info',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    textColor: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-200 dark:border-amber-800',
    label: 'Warning',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-rose-50 dark:bg-rose-900/20',
    textColor: 'text-rose-700 dark:text-rose-300',
    borderColor: 'border-rose-200 dark:border-rose-800',
    label: 'Error',
  },
  critical: {
    icon: XCircle,
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-800 dark:text-red-200',
    borderColor: 'border-red-300 dark:border-red-700',
    label: 'Critical',
  },
};

export function ErrorLogViewer({
  maxHeight = '500px',
  showControls = true,
  autoRefresh = false,
  refreshInterval = 5000,
}: ErrorLogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<ErrorSeverity | 'all'>('all');
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load logs on mount and set up listener
  useEffect(() => {
    setLogs(errorLogger.getLogs());

    const removeListener = errorLogger.addListener((entry) => {
      setLogs((prev) => [...prev, entry]);
    });

    return () => {
      removeListener();
    };
  }, []);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setLogs(errorLogger.getLogs());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;
      const matchesSearch =
        !searchTerm ||
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.context?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSeverity && matchesSearch;
    });
  }, [logs, severityFilter, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: logs.length,
      info: logs.filter((l) => l.severity === 'info').length,
      warning: logs.filter((l) => l.severity === 'warning').length,
      error: logs.filter((l) => l.severity === 'error').length,
      critical: logs.filter((l) => l.severity === 'critical').length,
    };
  }, [logs]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setLogs(errorLogger.getLogs());
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleClearLogs = () => {
    if (confirm('Are you sure you want to clear all logs? This cannot be undone.')) {
      errorLogger.clearLogs();
      setLogs([]);
    }
  };

  const handleDownload = () => {
    const filename = `error_logs_${new Date().toISOString().split('T')[0]}.json`;
    errorLogger.downloadLogs(filename);
  };

  const toggleLogExpanded = (index: number) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Error Logs
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {filteredLogs.length} of {stats.total} entries
            </p>
          </div>

          {showControls && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Download Logs"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleClearLogs}
                className="p-2 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                title="Clear Logs"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs mb-4">
          <span className="text-slate-500 dark:text-slate-400">
            Total: <span className="font-medium text-slate-700 dark:text-slate-300">{stats.total}</span>
          </span>
          <span className="text-blue-600 dark:text-blue-400">
            Info: <span className="font-medium">{stats.info}</span>
          </span>
          <span className="text-amber-600 dark:text-amber-400">
            Warning: <span className="font-medium">{stats.warning}</span>
          </span>
          <span className="text-rose-600 dark:text-rose-400">
            Error: <span className="font-medium">{stats.error}</span>
          </span>
          <span className="text-red-700 dark:text-red-300">
            Critical: <span className="font-medium">{stats.critical}</span>
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search logs..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as ErrorSeverity | 'all')}
            className="px-3 py-2 text-sm border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Log List */}
      <div className="overflow-y-auto" style={{ maxHeight }}>
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <Info className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No logs to display</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-gray-700">
            {[...filteredLogs].reverse().map((log, index) => {
              const config = SEVERITY_CONFIG[log.severity];
              const IconComponent = config.icon;
              const isExpanded = expandedLogs.has(index);
              const hasDetails = log.details || log.stack;

              return (
                <div
                  key={index}
                  className={`p-4 ${config.bgColor} hover:opacity-90 transition-opacity`}
                >
                  <div
                    className={`flex items-start gap-3 ${hasDetails ? 'cursor-pointer' : ''}`}
                    onClick={() => hasDetails && toggleLogExpanded(index)}
                  >
                    <IconComponent className={`w-5 h-5 ${config.textColor} shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${config.textColor} ${config.borderColor} border`}
                        >
                          {config.label}
                        </span>
                        {log.context && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            [{log.context}]
                          </span>
                        )}
                        <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 ml-auto">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                      <p className={`text-sm ${config.textColor}`}>{log.message}</p>

                      {/* Expanded Details */}
                      {isExpanded && hasDetails && (
                        <div className="mt-3 space-y-2">
                          {log.details !== undefined && log.details !== null && (
                            <div className="p-3 bg-white/50 dark:bg-gray-900/50 rounded border border-slate-200 dark:border-gray-600">
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Details:
                              </p>
                              <pre className="text-xs text-slate-600 dark:text-slate-400 font-mono whitespace-pre-wrap overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.stack && (
                            <div className="p-3 bg-white/50 dark:bg-gray-900/50 rounded border border-slate-200 dark:border-gray-600">
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Stack Trace:
                              </p>
                              <pre className="text-xs text-slate-600 dark:text-slate-400 font-mono whitespace-pre-wrap overflow-x-auto">
                                {log.stack}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {hasDetails && (
                      <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ErrorLogViewer;
