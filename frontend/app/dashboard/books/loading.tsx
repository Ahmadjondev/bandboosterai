export default function BooksLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Skeleton */}
        <div className="mb-8 animate-pulse">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-4 w-full max-w-2xl bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>

        {/* Books Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-80 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
