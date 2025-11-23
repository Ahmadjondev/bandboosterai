"use client";

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ServerErrorPageProps {
  statusCode?: number;
  message?: string;
  onRetry?: () => void;
}

export function ServerErrorPage({ 
  statusCode = 500, 
  message,
  onRetry 
}: ServerErrorPageProps) {
  const router = useRouter();

  const errorMessages = {
    500: {
      title: "Server Error",
      description: "Something went wrong on our end. We're working to fix it.",
    },
    503: {
      title: "Service Unavailable",
      description: "The service is temporarily unavailable. Please try again in a few moments.",
    },
    0: {
      title: "Connection Error",
      description: "Unable to connect to the server. Please check your internet connection.",
    },
  };

  const errorInfo = errorMessages[statusCode as keyof typeof errorMessages] || errorMessages[500];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 mb-6">
            <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            {errorInfo.title}
          </h1>
          
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
            {message || errorInfo.description}
          </p>
          
          {statusCode !== 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Error Code: {statusCode}
            </p>
          )}
        </div>

        <div className="space-y-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
          
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </button>
        </div>

        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> You are still logged in. Your session is safe.
          </p>
        </div>
      </div>
    </div>
  );
}
