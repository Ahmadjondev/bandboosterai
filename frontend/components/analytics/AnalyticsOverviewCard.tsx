"use client";

import { AnalyticsOverview } from "@/lib/exam-api";
import {
  TrendingUp,
  Target,
  Award,
  Star,
  BookOpen,
  Headphones,
  Pen,
  MessageCircle,
  Flame,
  Calendar,
} from "lucide-react";

interface AnalyticsOverviewCardProps {
  overview: AnalyticsOverview;
  userTier: string | null;
}

const SECTION_ICONS = {
  reading: BookOpen,
  listening: Headphones,
  writing: Pen,
  speaking: MessageCircle,
};

const SECTION_COLORS = {
  reading: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
  listening: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", bar: "bg-blue-500" },
  writing: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400", bar: "bg-purple-500" },
  speaking: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" },
};

const LEVEL_CONFIG = {
  "Not Started": { color: "gray", badge: "⭐" },
  "Beginner": { color: "red", badge: "🌱" },
  "Pre-Intermediate": { color: "orange", badge: "📚" },
  "Intermediate": { color: "yellow", badge: "🎯" },
  "Advanced": { color: "green", badge: "🚀" },
  "Expert": { color: "purple", badge: "👑" },
};

export default function AnalyticsOverviewCard({ overview, userTier }: AnalyticsOverviewCardProps) {
  const levelConfig = LEVEL_CONFIG[overview.current_level as keyof typeof LEVEL_CONFIG] || LEVEL_CONFIG["Not Started"];

  const getBandColor = (score: number | null) => {
    if (!score) return "text-gray-400";
    if (score >= 7.5) return "text-green-600 dark:text-green-400";
    if (score >= 6.5) return "text-blue-600 dark:text-blue-400";
    if (score >= 5.5) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getProgressToTarget = (current: number | null, target: number) => {
    if (!current) return 0;
    return Math.min((current / target) * 100, 100);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header with Overall Score */}
      <div className="bg-linear-to-r from-blue-600 via-purple-600 to-indigo-600 p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Overall Score */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <span className={`text-4xl font-bold text-white`}>
                  {overview.overall_average?.toFixed(1) || "—"}
                </span>
              </div>
            </div>
            <div>
              <p className="text-white/80 text-sm font-medium mb-1">Overall Average</p>
              <h2 className="text-2xl font-bold">Band Score</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-lg">{levelConfig.badge}</span>
                <span className="text-white/90 font-medium">{overview.current_level}</span>
              </div>
            </div>
          </div>

          {/* Target Progress */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 min-w-[200px]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-white/80" />
                <span className="text-sm text-white/80">Target Band</span>
              </div>
              <span className="text-xl font-bold">{overview.target_band}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 mb-2">
              <div
                className="bg-white h-3 rounded-full transition-all duration-500"
                style={{ width: `${getProgressToTarget(overview.overall_average, overview.target_band)}%` }}
              />
            </div>
            <p className="text-xs text-white/70 text-center">
              {overview.overall_average
                ? overview.overall_average >= overview.target_band
                  ? "🎉 Target achieved!"
                  : `${(overview.target_band - overview.overall_average).toFixed(1)} bands to go`
                : "Start practicing to track progress"}
            </p>
          </div>
        </div>
      </div>

      {/* Section Scores */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Section Scores</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.entries(overview.section_averages) as [keyof typeof SECTION_COLORS, number | null][]).map(
            ([section, score]) => {
              const Icon = SECTION_ICONS[section];
              const colors = SECTION_COLORS[section];
              const progress = score ? (score / 9) * 100 : 0;

              return (
                <div
                  key={section}
                  className="relative bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${colors.bg}`}>
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">{section}</p>
                      <p className={`text-2xl font-bold ${getBandColor(score)}`}>
                        {score?.toFixed(1) || "—"}
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`${colors.bar} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Activity Stats */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
            <div className="flex items-center justify-center gap-2 text-orange-500 mb-2">
              <Flame className="w-5 h-5" />
              <span className="text-2xl font-bold">{overview.streak_days}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Day Streak</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
            <div className="flex items-center justify-center gap-2 text-blue-500 mb-2">
              <Calendar className="w-5 h-5" />
              <span className="text-2xl font-bold">{overview.days_active}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Days Active</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
            <div className="flex items-center justify-center gap-2 text-purple-500 mb-2">
              <Award className="w-5 h-5" />
              <span className="text-2xl font-bold">{overview.total_attempts}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Attempts</p>
          </div>
        </div>
      </div>
    </div>
  );
}
