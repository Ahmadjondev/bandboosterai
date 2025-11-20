"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getDashboardStats, clearDashboardCache, type DashboardStats } from "@/lib/exam-api";
import { BookOpen, Clock, Target, TrendingUp, RefreshCw } from "lucide-react";

// Lazy load heavy components for better initial load performance
const BooksMotivationWidget = lazy(() => import("@/components/BooksMotivationWidget"));
const AchievementsWidget = lazy(() => import("@/components/dashboard/AchievementsWidget"));
const WeeklyProgressChart = lazy(() => import("@/components/dashboard/WeeklyProgressChart"));
const RecommendationsWidget = lazy(() => import("@/components/dashboard/RecommendationsWidget"));
const PerformanceInsights = lazy(() => import("@/components/dashboard/PerformanceInsights"));
const ScoreHistoryChart = lazy(() => import("@/components/dashboard/ScoreHistoryChart"));
const ActivityHeatmapWidget = lazy(() => import("@/components/dashboard/ActivityHeatmapWidget"));
const MotivationalBanner = lazy(() => import("@/components/dashboard/MotivationalBanner"));
const SkillGapsWidget = lazy(() => import("@/components/dashboard/SkillGapsWidget"));
const LearningVelocityCard = lazy(() => import("@/components/dashboard/LearningVelocityCard"));
const QuickStatsPanel = lazy(() => import("@/components/dashboard/QuickStatsPanel"));

// Component loading fallback
const ComponentLoader = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
    <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
  </div>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await clearDashboardCache();
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh dashboard");
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-red-800 dark:text-red-300 font-semibold mb-2">Error Loading Dashboard</h3>
          <p className="text-red-600 dark:text-red-400">{error || "Unknown error occurred"}</p>
        </div>
      </div>
    );
  }

  const { overview, section_stats, recent_tests } = stats;
  const sections = [
    { key: "listening" as const, name: "Listening", icon: "🎧" },
    { key: "reading" as const, name: "Reading", icon: "📖" },
    { key: "writing" as const, name: "Writing", icon: "✍️" },
    { key: "speaking" as const, name: "Speaking", icon: "🗣️" },
  ];

  const getBandScoreColor = (score: number | null) => {
    if (score === null) return "text-slate-400 dark:text-slate-500";
    if (score >= 7) return "text-green-600 dark:text-green-400";
    if (score >= 5.5) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
        {/* Email Verification Banner */}
        {/* {user && !user.is_verified && (
          <EmailVerificationBanner email={user.email} />
        )} */}

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 p-8 text-white">
          <div className="absolute inset-0 bg-black/10">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-96 h-96 bg-white/20 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
            </div>
          </div>

          <div className="relative flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">
                Welcome back, {user?.first_name || "Student"}! 👋
              </h1>
              <p className="text-white/90 text-lg">
                Your IELTS journey continues - track progress, earn achievements, and reach your goals!
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <Link
                href="/dashboard/cd-exam"
                className="px-6 py-3 bg-white text-blue-600 hover:bg-gray-100 rounded-lg transition-colors font-medium shadow-lg"
              >
                Start New Test
              </Link>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={<BookOpen className="w-6 h-6" />}
            label="Total Tests"
            value={overview.total_tests}
            bgColor="bg-blue-50 dark:bg-blue-900/20"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            icon={<Target className="w-6 h-6" />}
            label="Current Score"
            value={overview.current_score?.toFixed(1) || "--"}
            subtitle={`Target: ${overview.target_score}`}
            bgColor="bg-purple-50 dark:bg-purple-900/20"
            iconColor="text-purple-600 dark:text-purple-400"
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Overall Progress"
            value={`${overview.overall_progress}%`}
            bgColor="bg-green-50 dark:bg-green-900/20"
            iconColor="text-green-600 dark:text-green-400"
          />
          <StatCard
            icon={<Clock className="w-6 h-6" />}
            label="Study Streak"
            value={overview.streak_days}
            subtitle={`${overview.tests_this_week} tests this week`}
            bgColor="bg-orange-50 dark:bg-orange-900/20"
            iconColor="text-orange-600 dark:text-orange-400"
          />
        </div>

        {/* Books Motivation Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Suspense fallback={<ComponentLoader />}>
              <BooksMotivationWidget />
            </Suspense>
          </div>
          
          {/* Section Performance */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Section Performance
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections.map(({ key, name, icon }) => {
              const sectionData = section_stats[key];
              const score = sectionData.average_score?.toFixed(1) || "--";
              const progress = sectionData.progress;
              const gap = sectionData.average_score 
                ? (overview.target_score - sectionData.average_score).toFixed(1)
                : "--";
              
              // Color based on score relative to target
              let progressColor = "bg-red-500";
              if (sectionData.average_score) {
                if (sectionData.average_score >= overview.target_score) {
                  progressColor = "bg-green-500";
                } else if (sectionData.average_score >= 5.0) {
                  progressColor = "bg-yellow-500";
                }
              }

              return (
                <div key={key} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{icon}</span>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {sectionData.tests_count} {sectionData.tests_count === 1 ? "test" : "tests"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {score}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Gap: {gap}
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-300 ${progressColor}`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {progress}% of target
                  </div>
                </div>
              );
            })}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Tests */}
        {recent_tests.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Recent Tests
              </h2>
              <Link
                href="/dashboard/my-tests"
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
              >
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {recent_tests.slice(0, 5).map((test) => (
                <Link
                  key={test.id}
                  href={`/dashboard/results?attempt=${test.id}`}
                  className="block bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                          {test.exam_name}
                        </h3>
                        <span className="px-2 py-1 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-medium">
                          Completed
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs">
                          {new Date(test.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {/* <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs">
                          {test.exam_type}
                        </span> */}
                        
                      </div>
                    </div>

                    {test.overall_score !== null && (
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-3 text-sm">
                          {test.listening_score !== null && (
                            <div className="text-center">
                              <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">L</div>
                              <div className={`font-semibold ${getBandScoreColor(test.listening_score)}`}>
                                {test.listening_score.toFixed(1)}
                              </div>
                            </div>
                          )}
                          {test.reading_score !== null && (
                            <div className="text-center">
                              <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">R</div>
                              <div className={`font-semibold ${getBandScoreColor(test.reading_score)}`}>
                                {test.reading_score.toFixed(1)}
                              </div>
                            </div>
                          )}
                          {test.writing_score !== null && (
                            <div className="text-center">
                              <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">W</div>
                              <div className={`font-semibold ${getBandScoreColor(test.writing_score)}`}>
                                {test.writing_score.toFixed(1)}
                              </div>
                            </div>
                          )}
                          {test.speaking_score !== null && (
                            <div className="text-center">
                              <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">S</div>
                              <div className={`font-semibold ${getBandScoreColor(test.speaking_score)}`}>
                                {test.speaking_score.toFixed(1)}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="text-center pl-4 border-l border-slate-200 dark:border-slate-700">
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Overall</div>
                          <div className={`text-2xl font-bold ${getBandScoreColor(test.overall_score)}`}>
                            {test.overall_score.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Motivational Banner */}
        {stats.motivational_message && (
          <Suspense fallback={<ComponentLoader />}>
            <MotivationalBanner message={stats.motivational_message} />
          </Suspense>
        )}

        {/* Quick Stats Panel */}
        {stats.quick_stats && (
          <Suspense fallback={<ComponentLoader />}>
            <QuickStatsPanel stats={stats.quick_stats} />
          </Suspense>
        )}

        {/* Score History & Learning Velocity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {stats.score_history && (
              <Suspense fallback={<ComponentLoader />}>
                <ScoreHistoryChart history={stats.score_history} />
              </Suspense>
            )}
          </div>
          <div>
            {stats.learning_velocity && (
              <Suspense fallback={<ComponentLoader />}>
                <LearningVelocityCard velocity={stats.learning_velocity} />
              </Suspense>
            )}
          </div>
        </div>

        {/* Activity Heatmap & Achievements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {stats.activity_heatmap && (
            <Suspense fallback={<ComponentLoader />}>
              <ActivityHeatmapWidget heatmap={stats.activity_heatmap} />
            </Suspense>
          )}
          {stats.achievements && (
            <Suspense fallback={<ComponentLoader />}>
              <AchievementsWidget achievements={stats.achievements} />
            </Suspense>
          )}
        </div>

        {/* Skill Gaps & Weekly Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {stats.skill_gaps && (
            <Suspense fallback={<ComponentLoader />}>
              <SkillGapsWidget gaps={stats.skill_gaps} />
            </Suspense>
          )}
          {stats.weekly_progress && (
            <Suspense fallback={<ComponentLoader />}>
              <WeeklyProgressChart weeklyProgress={stats.weekly_progress} />
            </Suspense>
          )}
        </div>

        {/* Performance Insights - Full Width */}
        {stats.performance_insights && (
          <Suspense fallback={<ComponentLoader />}>
            <PerformanceInsights insights={stats.performance_insights} />
          </Suspense>
        )}

        {/* Recommendations */}
        {stats.recommendations && (
          <Suspense fallback={<ComponentLoader />}>
            <RecommendationsWidget recommendations={stats.recommendations} />
          </Suspense>
        )}
    </div>
  );
}

// Helper Components
function StatCard({
  icon,
  label,
  value,
  subtitle,
  bgColor,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  bgColor: string;
  iconColor: string;
}) {
  return (
    <div className={`${bgColor} rounded-lg p-6 border border-gray-200 dark:border-gray-700`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`${iconColor}`}>{icon}</div>
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </div>
      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
        {label}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {subtitle}
        </div>
      )}
    </div>
  );
}

function ActionCard({
  title,
  description,
  href,
  buttonText,
}: {
  title: string;
  description: string;
  href: string;
  buttonText: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {description}
      </p>
      <Link
        href={href}
        className="inline-block px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors text-sm font-medium"
      >
        {buttonText}
      </Link>
    </div>
  );
}
