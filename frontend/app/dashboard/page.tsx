"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { 
  getDashboardStats, 
  clearDashboardCache, 
  type DashboardStats,
  getDashboardOverviewV2,
  getDashboardSectionsV2,
  clearDashboardCacheV2,
  type DashboardOverviewV2,
  type DashboardSectionsV2,
  checkActiveAttempt,
} from "@/lib/exam-api";

// New dashboard components
import HeroSection from "@/components/dashboard/HeroSection";
import ScoreOverview from "@/components/dashboard/ScoreOverview";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentActivity from "@/components/dashboard/RecentActivity";
import StudyTips from "@/components/dashboard/StudyTips";
import PracticeStats from "@/components/dashboard/PracticeStats";

// Loading skeleton
function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 animate-pulse">
      {/* Hero Skeleton */}
      <div className="h-56 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      
      {/* Quick Actions Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        ))}
      </div>
      
      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-36 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// Error state
function DashboardError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
          <span className="text-2xl">😕</span>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          {error || "Failed to load dashboard data"}
        </p>
        <button
          onClick={onRetry}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  
  // State for V2 API data (fast endpoints)
  const [overviewV2, setOverviewV2] = useState<DashboardOverviewV2 | null>(null);
  const [sectionsV2, setSectionsV2] = useState<DashboardSectionsV2 | null>(null);
  
  // Legacy stats for remaining data
  const [stats, setStats] = useState<DashboardStats | null>(null);
  
  // Active attempt state
  const [hasActiveAttempt, setHasActiveAttempt] = useState(false);
  const [activeAttemptId, setActiveAttemptId] = useState<number | undefined>();
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load dashboard data
  const loadDashboard = useCallback(async () => {
    try {
      // Load V2 endpoints in parallel (these are faster)
      const [overviewData, sectionsData, activeAttemptData] = await Promise.all([
        getDashboardOverviewV2().catch(() => null),
        getDashboardSectionsV2().catch(() => null),
        checkActiveAttempt().catch(() => ({ has_active_attempt: false })),
      ]);

      setOverviewV2(overviewData);
      setSectionsV2(sectionsData);
      setHasActiveAttempt(activeAttemptData.has_active_attempt);
      setActiveAttemptId(activeAttemptData.active_attempt?.attempt_id);

      // Load legacy stats for recent tests
      const legacyStats = await getDashboardStats().catch(() => null);
      setStats(legacyStats);
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        clearDashboardCacheV2().catch(() => {}),
        clearDashboardCache().catch(() => {}),
      ]);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Loading state
  if (loading) {
    return <DashboardSkeleton />;
  }

  // Error state
  if (error && !stats && !overviewV2) {
    return <DashboardError error={error} onRetry={loadDashboard} />;
  }

  // Prepare data for components
  const userName = user?.first_name || user?.username || "Student";
  const currentScore = sectionsV2?.overall_average ?? stats?.overview.current_score ?? null;
  const targetScore = overviewV2?.target_score ?? stats?.overview.target_score ?? 7.5;
  const streakDays = overviewV2?.streak_days ?? stats?.overview.streak_days ?? 0;
  const testsThisWeek = overviewV2?.tests_this_week ?? stats?.overview.tests_this_week ?? 0;

  // Section data
  const sections = sectionsV2 ?? {
    listening: stats?.section_stats.listening ?? { average_score: null, tests_count: 0, progress: 0 },
    reading: stats?.section_stats.reading ?? { average_score: null, tests_count: 0, progress: 0 },
    writing: stats?.section_stats.writing ?? { average_score: null, tests_count: 0, progress: 0 },
    speaking: stats?.section_stats.speaking ?? { average_score: null, tests_count: 0, progress: 0 },
  };

  // Recent tests
  const recentTests = stats?.recent_tests ?? [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Hero Section */}
        <HeroSection
          userName={userName}
          currentScore={currentScore}
          targetScore={targetScore}
          streakDays={streakDays}
          testsThisWeek={testsThisWeek}
          onRefresh={handleRefresh}
          isRefreshing={refreshing}
        />

        {/* Quick Actions */}
        <QuickActions
          hasActiveAttempt={hasActiveAttempt}
          activeAttemptId={activeAttemptId}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Score Overview & Practice Stats */}
          <div className="lg:col-span-2 space-y-6">
            <ScoreOverview
              sections={{
                listening: {
                  average_score: sections.listening.average_score,
                  tests_count: sections.listening.tests_count,
                  best_score: 'best_score' in sections.listening ? sections.listening.best_score : null,
                  progress: sections.listening.progress ?? 0,
                },
                reading: {
                  average_score: sections.reading.average_score,
                  tests_count: sections.reading.tests_count,
                  best_score: 'best_score' in sections.reading ? sections.reading.best_score : null,
                  progress: sections.reading.progress ?? 0,
                },
                writing: {
                  average_score: sections.writing.average_score,
                  tests_count: sections.writing.tests_count,
                  best_score: 'best_score' in sections.writing ? sections.writing.best_score : null,
                  progress: sections.writing.progress ?? 0,
                },
                speaking: {
                  average_score: sections.speaking.average_score,
                  tests_count: sections.speaking.tests_count,
                  best_score: 'best_score' in sections.speaking ? sections.speaking.best_score : null,
                  progress: sections.speaking.progress ?? 0,
                },
              }}
              targetScore={targetScore}
              overallAverage={currentScore}
            />
            
            {/* Practice Progress */}
            <PracticeStats />
          </div>

          {/* Right Column - Recent Activity & Tips */}
          <div className="space-y-6">
            {/* Study Tips */}
            <StudyTips />
            
            {/* Recent Activity */}
            <RecentActivity tests={recentTests} maxItems={3} />
          </div>
        </div>
      </div>
    </div>
  );
}
