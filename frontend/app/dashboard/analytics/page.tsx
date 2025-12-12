"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import {
  loadAnalyticsData,
  AnalyticsOverview,
  AnalyticsSkillBreakdown,
  AnalyticsWeaknessAnalysis,
  AnalyticsProgressTrends,
  AnalyticsBandPrediction,
  AnalyticsStudyPlan,
  AnalyticsAchievements,
} from "@/lib/exam-api";
import {
  BarChart3,
  TrendingUp,
  Target,
  Brain,
  Calendar,
  Award,
  Lock,
  Crown,
  Zap,
  Sparkles,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Flame,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";

// Import analytics components
import AnalyticsOverviewCard from "@/components/analytics/AnalyticsOverviewCard";
import SkillBreakdownChart from "@/components/analytics/SkillBreakdownChart";
import ProgressTrendsChart from "@/components/analytics/ProgressTrendsChart";
import WeaknessAnalysisCard from "@/components/analytics/WeaknessAnalysisCard";
import BandPredictionCard from "@/components/analytics/BandPredictionCard";
import StudyPlanCard from "@/components/analytics/StudyPlanCard";
import AnalyticsQuestionTypeBreakdown from "@/components/analytics/AnalyticsQuestionTypeBreakdown";
import AnalyticsComparisonChart from "@/components/analytics/AnalyticsComparisonChart";
import AchievementsCard from "@/components/analytics/AchievementsCard";

// Plan tier configuration with static Tailwind classes
const PLAN_FEATURES = {
  FREE: {
    name: "Free",
    icon: BookOpen,
    features: ["7-day history", "Basic stats", "Progress trends", "Skill overview", "Achievements"],
    upgradeMessage: "Upgrade to Pro for detailed analysis",
    styles: {
      banner: "bg-linear-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700",
      iconBg: "bg-gray-100 dark:bg-gray-800",
      iconText: "text-gray-600 dark:text-gray-400",
      title: "text-gray-900 dark:text-gray-100",
      badge: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
    },
  },
  PLUS: {
    name: "Plus",
    icon: Zap,
    features: ["30-day history", "Section averages", "Activity tracking", "Progress charts"],
    upgradeMessage: "Upgrade to Pro for detailed analysis",
    styles: {
      banner: "bg-linear-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800",
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
      iconText: "text-blue-600 dark:text-blue-400",
      title: "text-blue-900 dark:text-blue-100",
      badge: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    },
  },
  PRO: {
    name: "Pro",
    icon: Crown,
    features: ["90-day history", "Detailed skill breakdown", "Weakness analysis", "Question type stats"],
    upgradeMessage: "Upgrade to Ultra for AI predictions",
    styles: {
      banner: "bg-linear-to-r from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-200 dark:border-purple-800",
      iconBg: "bg-purple-100 dark:bg-purple-900/40",
      iconText: "text-purple-600 dark:text-purple-400",
      title: "text-purple-900 dark:text-purple-100",
      badge: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    },
  },
  ULTRA: {
    name: "Ultra",
    icon: Sparkles,
    features: ["Unlimited history", "Band prediction", "AI study plans", "Complete analytics"],
    upgradeMessage: null,
    styles: {
      banner: "bg-linear-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200 dark:border-amber-800",
      iconBg: "bg-amber-100 dark:bg-amber-900/40",
      iconText: "text-amber-600 dark:text-amber-400",
      title: "text-amber-900 dark:text-amber-100",
      badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    },
  },
};

type PlanTier = keyof typeof PLAN_FEATURES | null;

// Locked Feature Card Component
function LockedFeatureCard({
  title,
  description,
  requiredPlan,
  icon: Icon,
}: {
  title: string;
  description: string;
  requiredPlan: "PLUS" | "PRO" | "ULTRA";
  icon: React.ElementType;
}) {
  const planConfig = PLAN_FEATURES[requiredPlan];

  return (
    <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 overflow-hidden">
      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-[2px] bg-white/30 dark:bg-black/30 z-10" />
      
      {/* Lock badge */}
      <div className="absolute top-4 right-4 z-20">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${planConfig.styles.badge}`}>
          <Lock className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">{planConfig.name}+</span>
        </div>
      </div>

      {/* Blurred content preview */}
      <div className="relative z-0 opacity-40">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 rounded-xl ${planConfig.styles.iconBg}`}>
            <Icon className={`w-6 h-6 ${planConfig.styles.iconText}`} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      </div>

      {/* Unlock CTA */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <div className="text-center p-6">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${planConfig.styles.iconBg} mb-4`}>
            <Lock className={`w-8 h-8 ${planConfig.styles.iconText}`} />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-xs">{description}</p>
          <Link
            href="/dashboard/pricing"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-colors font-medium text-sm"
          >
            <Sparkles className="w-4 h-4" />
            Upgrade to {planConfig.name}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Analytics data states
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [skills, setSkills] = useState<AnalyticsSkillBreakdown | null>(null);
  const [weaknesses, setWeaknesses] = useState<AnalyticsWeaknessAnalysis | null>(null);
  const [progress, setProgress] = useState<AnalyticsProgressTrends | null>(null);
  const [bandPrediction, setBandPrediction] = useState<AnalyticsBandPrediction | null>(null);
  const [studyPlan, setStudyPlan] = useState<AnalyticsStudyPlan | null>(null);
  const [achievements, setAchievements] = useState<AnalyticsAchievements | null>(null);

  // Determine user's subscription tier
  const userTier: PlanTier = (overview?.subscription_tier as PlanTier) || null;
  const planConfig = userTier ? PLAN_FEATURES[userTier] : PLAN_FEATURES.FREE;

  const loadData = useCallback(async () => {
    try {
      const data = await loadAnalyticsData();
      setOverview(data.overview);
      setSkills(data.skills);
      setWeaknesses(data.weaknesses);
      setProgress(data.progress);
      setBandPrediction(data.bandPrediction);
      setStudyPlan(data.studyPlan);
      setAchievements(data.achievements);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="text-red-800 dark:text-red-300 font-semibold">Error Loading Analytics</h3>
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const hasProAccess = userTier === "PRO" || userTier === "ULTRA";
  const hasUltraAccess = userTier === "ULTRA";
  const hasPlusAccess = userTier === "PLUS" || hasProAccess;

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-linear-to-br from-purple-500 to-blue-600 rounded-xl">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Analytics Dashboard
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Track your IELTS preparation progress and identify areas for improvement
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Plan Badge */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${planConfig.styles.badge}`}>
            <planConfig.icon className="w-4 h-4" />
            <span className="font-semibold text-sm">{planConfig.name} Plan</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Plan Features Banner (for non-Ultra users) */}
      {!hasUltraAccess && (
        <div className={`${planConfig.styles.banner} border rounded-xl p-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${planConfig.styles.iconBg}`}>
                <Sparkles className={`w-5 h-5 ${planConfig.styles.iconText}`} />
              </div>
              <div>
                <h3 className={`font-semibold ${planConfig.styles.title}`}>
                  {planConfig.upgradeMessage}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  {userTier === "FREE" && "Get detailed insights, progress tracking, and personalized recommendations"}
                  {userTier === "PLUS" && "Unlock skill breakdown, weakness analysis, and question type statistics"}
                  {userTier === "PRO" && "Access AI-powered band predictions and personalized study plans"}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/pricing"
              className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors font-medium text-sm whitespace-nowrap"
            >
              <Crown className="w-4 h-4" />
              View Plans
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Overview Section - Available to ALL users */}
      {overview && (
        <AnalyticsOverviewCard overview={overview} userTier={userTier} />
      )}

      {/* Quick Stats Grid - All Users */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Tests Taken</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {overview?.total_attempts || 0}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Flame className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Day Streak</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {overview?.streak_days || 0}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Practice Sessions</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {overview?.total_practice_sessions || 0}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Days Active</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {overview?.days_active || 0}
          </div>
        </div>
      </div>

      {/* Achievements Section - Available to ALL users */}
      {achievements && (
        <AchievementsCard achievements={achievements} />
      )}

      {/* Progress Trends - All users can see progress trends now */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {progress ? (
          <ProgressTrendsChart progress={progress} />
        ) : (
          <LockedFeatureCard
            title="Progress Trends"
            description="Track your score progression over time with detailed charts and improvement rates"
            requiredPlan="PLUS"
            icon={TrendingUp}
          />
        )}

        {/* Section Comparison - All users */}
        {overview ? (
          <AnalyticsComparisonChart overview={overview} />
        ) : (
          <LockedFeatureCard
            title="Section Comparison"
            description="Compare your performance across Reading, Listening, Writing, and Speaking"
            requiredPlan="PLUS"
            icon={BarChart3}
          />
        )}
      </div>

      {/* Skill Breakdown - Now available to ALL users (limited for free, detailed for Pro+) */}
      {skills ? (
        <>
          <SkillBreakdownChart skills={skills} />
          {/* Show question type analysis for Pro+ users */}
          {hasProAccess && <AnalyticsQuestionTypeBreakdown skills={skills} />}
        </>
      ) : (
        <LockedFeatureCard
          title="Skill Breakdown"
          description="Detailed analysis of your performance by question type with accuracy rates and trends"
          requiredPlan="PRO"
          icon={Brain}
        />
      )}

      {/* Question Type Analysis hint for non-Pro users */}
      {skills && !hasProAccess && (
        <div className="bg-linear-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40">
              <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                Want detailed question type analysis?
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Upgrade to Pro for in-depth breakdown of each question type with personalized tips
              </p>
            </div>
            <a
              href="/dashboard/pricing"
              className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Upgrade
            </a>
          </div>
        </div>
      )}

      {/* Weakness Analysis - Pro+ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {hasProAccess && weaknesses ? (
          <WeaknessAnalysisCard weaknesses={weaknesses} />
        ) : (
          <LockedFeatureCard
            title="Weakness Analysis"
            description="AI-powered identification of your weak areas with prioritized improvement tips"
            requiredPlan="PRO"
            icon={AlertTriangle}
          />
        )}

        {/* Band Prediction - Ultra */}
        {hasUltraAccess && bandPrediction ? (
          <BandPredictionCard prediction={bandPrediction} />
        ) : (
          <LockedFeatureCard
            title="Band Prediction"
            description="AI-powered prediction of your expected IELTS band score based on your practice history"
            requiredPlan="ULTRA"
            icon={Award}
          />
        )}
      </div>

      {/* AI Study Plan - Ultra */}
      {hasUltraAccess && studyPlan ? (
        <StudyPlanCard studyPlan={studyPlan} />
      ) : (
        <LockedFeatureCard
          title="AI-Powered Study Plan"
          description="Get a personalized weekly study plan tailored to your weaknesses and goals"
          requiredPlan="ULTRA"
          icon={Calendar}
        />
      )}

      {/* History Limit Notice */}
      {overview?.tier_limits && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4 border-t border-gray-200 dark:border-gray-700">
          <Clock className="w-4 h-4 inline mr-1.5" />
          Showing data from the last{" "}
          <span className="font-medium">
            {overview.tier_limits.history_days === "unlimited"
              ? "all time"
              : `${overview.tier_limits.history_days} days`}
          </span>
          {overview.tier_limits.history_days !== "unlimited" && (
            <span>
              {" "}
              •{" "}
              <Link href="/dashboard/pricing" className="text-blue-600 hover:underline">
                Upgrade for more history
              </Link>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
