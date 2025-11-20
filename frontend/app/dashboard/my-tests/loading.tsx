export default function MyTestsLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Skeleton */}
        <div className="mb-8 animate-pulse">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>

        {/* Filters Skeleton */}
        <div className="mb-6 flex gap-4 animate-pulse">
          <div className="h-10 w-32 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"></div>
          <div className="h-10 w-32 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"></div>
        </div>

        {/* Tests List Skeleton */}
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
