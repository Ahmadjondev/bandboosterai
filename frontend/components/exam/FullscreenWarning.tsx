/**
 * Fullscreen Warning Component
 * Warning overlay when user exits fullscreen during test
 */

"use client";

interface FullscreenWarningProps {
  onDismiss: () => void;
  onEnterFullscreen: () => void;
}

export default function FullscreenWarning({
  onDismiss,
  onEnterFullscreen,
}: FullscreenWarningProps) {
  return (
    <>
      {/* Semi-transparent backdrop */}
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6 transition-colors duration-300 border border-gray-200 dark:border-gray-700">
          {/* Warning Icon */}
          <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-4 transition-colors duration-300 border-2 border-yellow-200 dark:border-yellow-800">
            <svg
              className="w-8 h-8 text-yellow-600 dark:text-yellow-400 transition-colors duration-300"
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

          {/* Warning Title */}
          <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-3 transition-colors duration-300">
            Fullscreen Mode Required
          </h3>

          {/* Warning Message */}
          <p className="text-gray-700 dark:text-gray-200 text-center mb-6 transition-colors duration-300 leading-relaxed">
            You have exited fullscreen mode. The IELTS test must be taken in fullscreen
            to simulate real exam conditions.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={onEnterFullscreen}
              className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm"
            >
              Re-enter Fullscreen
            </button>
            
            <button
              onClick={onDismiss}
              className="w-full px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors duration-200 border border-gray-300 dark:border-gray-600"
            >
              Continue Without Fullscreen
            </button>
          </div>

          {/* Info Note */}
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center mt-4 transition-colors duration-300">
            Note: Exam proctoring systems may flag fullscreen exits
          </p>
        </div>
      </div>
    </>
  );
}
