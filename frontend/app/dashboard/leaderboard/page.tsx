import { DashboardLayout } from '@/components/DashboardLayout';

export default function LeaderboardPage() {
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Leaderboard 🏆
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            See how you rank against other students
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-linear-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 text-white">
            <div className="text-center">
              <div className="text-6xl mb-4">🥇</div>
              <p className="text-sm opacity-90 mb-2">Top Scorer</p>
              <p className="text-2xl font-bold">Coming Soon</p>
            </div>
          </div>

          <div className="bg-linear-to-br from-slate-300 to-slate-400 rounded-2xl p-6 text-white">
            <div className="text-center">
              <div className="text-6xl mb-4">🥈</div>
              <p className="text-sm opacity-90 mb-2">Runner Up</p>
              <p className="text-2xl font-bold">Coming Soon</p>
            </div>
          </div>

          <div className="bg-linear-to-br from-amber-600 to-amber-700 rounded-2xl p-6 text-white">
            <div className="text-center">
              <div className="text-6xl mb-4">🥉</div>
              <p className="text-sm opacity-90 mb-2">Third Place</p>
              <p className="text-2xl font-bold">Coming Soon</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700">
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <span className="text-6xl">🏆</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Leaderboard Coming Soon
            </h3>
            <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Compete with other students and see where you rank. The leaderboard will be available soon!
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
