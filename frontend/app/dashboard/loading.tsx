export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="space-y-8 p-4 sm:p-6 lg:p-8 animate-pulse">
        {/* Hero Header Skeleton */}
        <div className="h-40 bg-linear-to-r from-blue-200 via-purple-200 to-pink-200 dark:from-blue-900 dark:via-purple-900 dark:to-pink-900 rounded-2xl"></div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"></div>
          ))}
        </div>

        {/* Main Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"></div>
          <div className="lg:col-span-2 h-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"></div>
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"></div>
          <div className="h-80 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"></div>
        </div>
      </div>
    </div>
  );
}
