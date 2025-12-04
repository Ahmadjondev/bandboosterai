"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  loadAnalyticsData,
  type AnalyticsOverview,
  type AnalyticsSkillBreakdown,
  type AnalyticsWeaknessAnalysis,
  type AnalyticsProgressTrends,
  type AnalyticsBandPrediction,
  type AnalyticsStudyPlan,
} from "@/lib/exam-api";
import {
  BarChart3,
  TrendingUp,
  Target,
  AlertTriangle,
  BookOpen,
  Crown,
  Lock,
  RefreshCw,
  Brain,
  Calendar,
  Zap,
  Award,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";

// Helper to get band color
function getBandColor(band: number | null | undefined): string {
  if (band === null || band === undefined) return "text-gray-400";
  if (band >= 7.5) return "text-green-500";
  if (band >= 6.5) return "text-blue-500";
  if (band >= 5.5) return "text-yellow-500";
  return "text-red-500";
}

// Safe number formatting helper
function formatScore(value: number | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined) return "—";
  return value.toFixed(decimals);
}

// Helper to get trend icon
function TrendIcon({ trend }: { trend: string }) {
  if (trend === "improving") return <ArrowUp className="w-4 h-4 text-green-500" />;
  if (trend === "declining") return <ArrowDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
}

// Subscription tier badge
function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) {
    return (
      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
        Free
      </span>
    );
  }
  const colors = {
    PLUS: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    PRO: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    ULTRA: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  };
  return (
    <span className={`px-2 py-1 text-xs ${colors[tier as keyof typeof colors] || colors.PLUS} rounded-full flex items-center gap-1`}>
      <Crown className="w-3 h-3" />
      {tier}
    </span>
  );
}

// Locked feature overlay
function LockedOverlay({ requiredTier, currentTier }: { requiredTier: string; currentTier: string | null }) {
console.log("Required Tier:", requiredTier, "Current Tier:", currentTier);
  return (
    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-10">
      <Lock className="w-8 h-8 text-white mb-2" />
      <p className="text-white text-sm font-medium">Requires {requiredTier} Plan</p>
      <Link
        href="/dashboard/pricing"
        className="mt-2 px-4 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm rounded-full hover:opacity-90 transition-opacity"
      >
        Upgrade Now
      </Link>
    </div>
  );
}

// Section score card
function SectionScoreCard({ 
  section, 
  score, 
  icon: Icon, 
  color 
}: { 
  section: string; 
  score: number | null | undefined; 
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">{section}</span>
      </div>
      <div className={`text-2xl font-bold ${getBandColor(score)}`}>
        {formatScore(score)}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [skills, setSkills] = useState<AnalyticsSkillBreakdown | null>(null);
  const [weaknesses, setWeaknesses] = useState<AnalyticsWeaknessAnalysis | null>(null);
  const [progress, setProgress] = useState<AnalyticsProgressTrends | null>(null);
  const [bandPrediction, setBandPrediction] = useState<AnalyticsBandPrediction | null>(null);
  const [studyPlan, setStudyPlan] = useState<AnalyticsStudyPlan | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await loadAnalyticsData();
      setOverview(data.overview);
      setSkills(data.skills);
      setWeaknesses(data.weaknesses);
      setProgress(data.progress);
      setBandPrediction(data.bandPrediction);
      setStudyPlan(data.studyPlan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const tier = overview?.subscription_tier || null;
  const hasWeaknessAnalysis = overview?.tier_limits?.has_weakness_analysis || false;
  const hasBandPrediction = overview?.tier_limits?.has_band_prediction || false;
  const hasAiStudyPlan = overview?.tier_limits?.has_ai_study_plan || false;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Failed to Load Analytics</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-blue-600" />
              Performance Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track your progress and identify areas for improvement
            </p>
          </div>
          <div className="flex items-center gap-3">
            <TierBadge tier={tier} />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
                <Target className="w-4 h-4" />
                Overall Band
              </div>
              <div className={`text-3xl font-bold ${getBandColor(overview.overall_average)}`}>
                {formatScore(overview.overall_average)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Target: {overview.target_band ?? 7.0}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
                <BookOpen className="w-4 h-4" />
                Total Attempts
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {overview.total_attempts ?? 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">+ {overview.total_practice_sessions ?? 0} practice</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
                <Calendar className="w-4 h-4" />
                Days Active
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {overview.days_active ?? 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">{overview.streak_days ?? 0} day streak 🔥</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
                <Award className="w-4 h-4" />
                Current Level
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {overview.current_level ?? "Not Started"}
              </div>
              <div className="text-xs text-gray-500 mt-1">{overview.total_books_completed ?? 0} books done</div>
            </div>
          </div>
        )}

        {/* Section Scores */}
        {overview && overview.section_averages && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SectionScoreCard
              section="Reading"
              score={overview.section_averages.reading}
              icon={BookOpen}
              color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
            />
            <SectionScoreCard
              section="Listening"
              score={overview.section_averages.listening}
              icon={BookOpen}
              color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
            />
            <SectionScoreCard
              section="Writing"
              score={overview.section_averages.writing}
              icon={BookOpen}
              color="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
            />
            <SectionScoreCard
              section="Speaking"
              score={overview.section_averages.speaking}
              icon={BookOpen}
              color="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
            />
          </div>
        )}

        {/* Main Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Skill Breakdown */}
          {skills && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Skill Breakdown
              </h2>
              <div className="space-y-4">
                {/* Reading */}
                {skills.reading && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">Reading</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {((skills.reading.overall_accuracy ?? 0) * 100).toFixed(0)}% accuracy
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(skills.reading.strengths ?? []).map((s, i) => (
                        <span key={i} className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">
                          ✓ {s}
                        </span>
                      ))}
                      {(skills.reading.weaknesses ?? []).map((w, i) => (
                        <span key={i} className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                          ✗ {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Listening */}
                {skills.listening && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">Listening</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {((skills.listening.overall_accuracy ?? 0) * 100).toFixed(0)}% accuracy
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(skills.listening.strengths ?? []).map((s, i) => (
                        <span key={i} className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">
                          ✓ {s}
                        </span>
                      ))}
                      {(skills.listening.weaknesses ?? []).map((w, i) => (
                        <span key={i} className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                          ✗ {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Writing */}
                {skills.writing && skills.writing.overall_score && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">Writing</span>
                      <span className={`text-sm font-medium ${getBandColor(skills.writing.overall_score)}`}>
                        Band {formatScore(skills.writing.overall_score)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(skills.writing.criteria_breakdown ?? {}).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className={getBandColor(value)}>{formatScore(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Speaking */}
                {skills.speaking && skills.speaking.overall_score && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">Speaking</span>
                      <span className={`text-sm font-medium ${getBandColor(skills.speaking.overall_score)}`}>
                        Band {formatScore(skills.speaking.overall_score)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(skills.speaking.criteria_breakdown ?? {}).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className={getBandColor(value)}>{formatScore(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress Trends */}
          {progress && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Progress Trends
                <span className="text-xs text-gray-500 ml-auto">{progress.time_period ?? "All time"}</span>
              </h2>
              <div className="space-y-4">
                {/* Improvement rates */}
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(progress.improvement_rate ?? {}).map(([section, rate]) => (
                    <div key={section} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{section}</span>
                      <span className={`text-sm font-medium flex items-center gap-1 ${(rate ?? 0) > 0 ? 'text-green-500' : (rate ?? 0) < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {(rate ?? 0) > 0 ? <ArrowUp className="w-3 h-3" /> : (rate ?? 0) < 0 ? <ArrowDown className="w-3 h-3" /> : null}
                        {(rate ?? 0) > 0 ? '+' : ''}{(((rate ?? 0)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
                {/* Simple trend visualization */}
                {progress.trends && progress.trends.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Recent Scores</h4>
                    <div className="space-y-2">
                      {progress.trends.slice(-5).map((trend, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500 dark:text-gray-400 w-24">{trend.date ? new Date(trend.date).toLocaleDateString() : "N/A"}</span>
                          <div className="flex-1 flex gap-2">
                            {trend.reading != null && <span className="text-blue-500">R:{formatScore(trend.reading)}</span>}
                            {trend.listening != null && <span className="text-green-500">L:{formatScore(trend.listening)}</span>}
                            {trend.writing != null && <span className="text-purple-500">W:{formatScore(trend.writing)}</span>}
                            {trend.speaking != null && <span className="text-orange-500">S:{formatScore(trend.speaking)}</span>}
                          </div>
                          {trend.overall != null && (
                            <span className={`font-medium ${getBandColor(trend.overall)}`}>
                              {formatScore(trend.overall)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Weakness Analysis (Pro+) */}
          <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            {!hasWeaknessAnalysis && <LockedOverlay requiredTier="Pro" currentTier={tier} />}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Weakness Analysis
              {!hasWeaknessAnalysis && <Lock className="w-4 h-4 text-gray-400 ml-auto" />}
            </h2>
            {weaknesses && hasWeaknessAnalysis ? (
              <div className="space-y-3">
                {weaknesses.overall_weakest_section && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      <strong>Focus area:</strong> Your weakest section is <span className="capitalize">{weaknesses.overall_weakest_section}</span>
                    </p>
                  </div>
                )}
                {(weaknesses.weaknesses ?? []).map((w, i) => (
                  <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 dark:text-white capitalize">{w.section} - {w.weakness_type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        w.priority === 'high' ? 'bg-red-100 text-red-600' :
                        w.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {w.priority} priority
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Current: {formatScore(w.current_score)} → Target: {formatScore(w.target_score)}
                    </div>
                    <ul className="mt-2 text-xs text-gray-500 space-y-1">
                      {(w.improvement_tips ?? []).slice(0, 2).map((tip, j) => (
                        <li key={j}>• {tip}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-400">
                {hasWeaknessAnalysis ? "No data yet" : "Upgrade to Pro to see weakness analysis"}
              </div>
            )}
          </div>

          {/* Band Prediction (Ultra) */}
          <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            {!hasBandPrediction && <LockedOverlay requiredTier="Ultra" currentTier={tier} />}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              Band Prediction
              {!hasBandPrediction && <Lock className="w-4 h-4 text-gray-400 ml-auto" />}
            </h2>
            {bandPrediction && hasBandPrediction ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-8">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-1">Current</p>
                    <p className={`text-4xl font-bold ${getBandColor(bandPrediction.current_estimated_band)}`}>
                      {formatScore(bandPrediction.current_estimated_band)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-gray-300" />
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-1">Predicted</p>
                    <p className={`text-4xl font-bold ${getBandColor(bandPrediction.predicted_band)}`}>
                      {formatScore(bandPrediction.predicted_band)}
                    </p>
                  </div>
                </div>
                <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                  <p>Confidence: <span className="font-medium capitalize">{bandPrediction.confidence_level ?? "N/A"}</span></p>
                  <p>{bandPrediction.time_to_goal ?? ""}</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-sm text-purple-800 dark:text-purple-200">{bandPrediction.recommendation ?? "Complete more tests for personalized recommendations."}</p>
                </div>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-400">
                {hasBandPrediction ? "Not enough data for prediction" : "Upgrade to Ultra for band predictions"}
              </div>
            )}
          </div>
        </div>

        {/* Study Plan (Ultra) */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          {!hasAiStudyPlan && <LockedOverlay requiredTier="Ultra" currentTier={tier} />}
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            AI Study Plan
            {!hasAiStudyPlan && <Lock className="w-4 h-4 text-gray-400 ml-auto" />}
          </h2>
          {studyPlan && hasAiStudyPlan ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Total weekly hours: <strong>{studyPlan.total_weekly_hours ?? 0}h</strong>
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  Next milestone: <strong>{studyPlan.next_milestone ?? "N/A"}</strong>
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {(studyPlan.weekly_plan ?? []).map((day, i) => (
                  <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="font-medium text-gray-900 dark:text-white text-sm mb-1">{day.day}</div>
                    <div className="text-xs text-purple-600 dark:text-purple-400 mb-2 capitalize">{day.focus_section}</div>
                    <ul className="text-xs text-gray-500 space-y-1">
                      {(day.activities ?? []).slice(0, 2).map((act, j) => (
                        <li key={j}>• {act}</li>
                      ))}
                    </ul>
                    <div className="mt-2 text-xs text-gray-400">{day.duration_minutes ?? 0} min</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-400">
              {hasAiStudyPlan ? "No study plan generated yet" : "Upgrade to Ultra for personalized AI study plans"}
            </div>
          )}
        </div>

        {/* Upgrade CTA for non-subscribers */}
        {!tier && (
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-1">Unlock Advanced Analytics</h3>
                <p className="text-purple-100">
                  Get detailed weakness analysis, band predictions, and personalized study plans
                </p>
              </div>
              <Link
                href="/dashboard/pricing"
                className="px-6 py-3 bg-white text-purple-600 font-semibold rounded-lg hover:bg-purple-50 transition-colors"
              >
                View Plans
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
