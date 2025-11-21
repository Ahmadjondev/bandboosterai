export default function BooksLoading() {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Header Skeleton */}
        <div className="mb-8 h-64 bg-linear-to-br from-blue-600 via-purple-600 to-pink-600 rounded-2xl animate-pulse relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10 p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-white/20 rounded-xl"></div>
              <div className="flex-1 space-y-3">
                <div className="h-8 w-64 bg-white/20 rounded"></div>
                <div className="h-4 w-96 bg-white/10 rounded"></div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-white/10 rounded-xl border border-white/20"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Search Bar Skeleton */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6 animate-pulse">
          <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded-lg mb-4"></div>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 w-16 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
            ))}
          </div>
        </div>

        {/* Books Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-pulse">
              {/* Card Header */}
              <div className="h-32 bg-linear-to-br from-gray-300 to-gray-400 dark:from-slate-700 dark:to-slate-600"></div>
              {/* Card Body */}
              <div className="p-5 space-y-3">
                <div className="h-6 w-3/4 bg-gray-200 dark:bg-slate-700 rounded"></div>
                <div className="h-4 w-1/2 bg-gray-200 dark:bg-slate-700 rounded"></div>
                <div className="h-2 w-full bg-gray-200 dark:bg-slate-700 rounded-full mt-4"></div>
                <div className="flex items-center justify-between">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-4 w-12 bg-gray-200 dark:bg-slate-700 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
