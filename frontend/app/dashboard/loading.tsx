export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8 animate-pulse">
        {/* Hero Section Skeleton */}
        <div className="h-56 bg-slate-800 rounded-2xl" />
        
        {/* Quick Actions Skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-20 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700" />
            <div className="h-20 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700" />
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Overall Score */}
            <div className="h-32 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700" />
            {/* Section Cards */}
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-36 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700" />
              ))}
            </div>
          </div>
          
          {/* Right Column */}
          <div className="space-y-4">
            {/* Study Tips */}
            <div className="h-36 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800" />
            {/* Recent Activity */}
            <div className="space-y-3">
              <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
