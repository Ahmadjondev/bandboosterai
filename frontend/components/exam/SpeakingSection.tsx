/**
 * Speaking Section Component (Placeholder)
 * TODO: Implement audio recording for speaking questions
 */

"use client";

export default function SpeakingSection() {
  return (
    <div className="h-full flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="text-center max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 transition-colors duration-300 border border-gray-200 dark:border-gray-700">
        <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-purple-200 dark:border-purple-800">
          <svg
            className="w-10 h-10 text-purple-600 dark:text-purple-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Speaking Section
        </h2>
        <p className="text-gray-700 dark:text-gray-200 mb-4 leading-relaxed">
          This component is under development
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-lg text-sm border border-yellow-200 dark:border-yellow-800">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          Audio recorder for 3 parts coming soon
        </div>
      </div>
    </div>
  );
}
