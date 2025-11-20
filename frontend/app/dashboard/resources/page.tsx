

export default function ResourcesPage() {
  return (
    
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Study Resources 📚
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Access helpful materials and study guides
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-4">
              <span className="text-2xl">📖</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Study Guides</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              Comprehensive guides for all IELTS sections
            </p>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Coming Soon</span>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mb-4">
              <span className="text-2xl">🎥</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Video Tutorials</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              Expert tips and strategies in video format
            </p>
            <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">Coming Soon</span>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
              <span className="text-2xl">📝</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Practice Materials</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              Additional practice questions and exercises
            </p>
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">Coming Soon</span>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mb-4">
              <span className="text-2xl">💡</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Tips & Tricks</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              Proven strategies to boost your band score
            </p>
            <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">Coming Soon</span>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Band Score Guide</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              Understand the IELTS scoring system
            </p>
            <span className="text-sm font-semibold text-red-600 dark:text-red-400">Coming Soon</span>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center mb-4">
              <span className="text-2xl">🗣️</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Speaking Practice</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              Sample answers and speaking topics
            </p>
            <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Coming Soon</span>
          </div>
        </div>
      </div>
    
  );
}
