export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Card Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 animate-pulse">
          {/* Avatar */}
          <div className="flex items-center gap-6 mb-8">
            <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="flex-1">
              <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>

          {/* Form Fields Skeleton */}
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i}>
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-10 w-full bg-gray-100 dark:bg-gray-900 rounded"></div>
              </div>
            ))}
          </div>

          {/* Button Skeleton */}
          <div className="mt-8 h-10 w-32 bg-blue-200 dark:bg-blue-900 rounded"></div>
        </div>
      </div>
    </div>
  );
}
