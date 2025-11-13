/**
 * Loading Screen Component
 * Displays a centered loading spinner during API calls
 */

export default function LoadingScreen() {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="text-center">
        {/* Spinner */}
        <div className="inline-block">
          <div className="w-16 h-16 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin"></div>
        </div>
        
        {/* Loading text */}
        <p className="mt-4 text-lg font-medium text-gray-800 dark:text-gray-100 transition-colors duration-300">
          Loading...
        </p>
      </div>
    </div>
  );
}
