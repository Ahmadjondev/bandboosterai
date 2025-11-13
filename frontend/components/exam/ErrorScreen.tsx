/**
 * Error Screen Component
 * Displays errors with retry and navigation options
 */

"use client";

import { useRouter } from "next/navigation";

interface ErrorScreenProps {
  error: string;
}

export default function ErrorScreen({ error }: ErrorScreenProps) {
  const router = useRouter();

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 transition-colors duration-300">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6 transition-colors duration-300 border-2 border-red-200 dark:border-red-800">
          <svg
            className="w-10 h-10 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Error Title */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 transition-colors duration-300">
          Something went wrong
        </h2>

        {/* Error Message */}
        <p className="text-gray-700 dark:text-gray-200 mb-8 transition-colors duration-300 leading-relaxed">
          {error}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm"
          >
            Try Again
          </button>
          
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors duration-200 border border-gray-300 dark:border-gray-600"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
