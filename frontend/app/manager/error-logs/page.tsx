/**
 * Error Logs Page
 * Displays error logs from the manager panel
 */

'use client';

import { ErrorLogViewer } from '@/components/manager/shared/ErrorLogViewer';
import { AlertCircle } from 'lucide-react';

export default function ErrorLogsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
          <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Error Logs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            View and manage application error logs
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">About Error Logs</p>
            <p>
              Error logs are stored locally in your browser and are automatically
              cleaned up when they exceed 100 entries. Logs are useful for debugging
              issues and tracking API errors during development.
            </p>
          </div>
        </div>
      </div>

      {/* Error Log Viewer */}
      <ErrorLogViewer
        maxHeight="600px"
        showControls={true}
        autoRefresh={false}
      />
    </div>
  );
}
