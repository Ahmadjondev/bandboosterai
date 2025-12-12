"use client";

import { Award, Trophy, Star, Target, Zap, ChevronRight } from "lucide-react";
import type { AnalyticsAchievements } from "@/lib/exam-api";

interface AchievementsCardProps {
  achievements: AnalyticsAchievements;
}

// Achievement icon mapping
const ACHIEVEMENT_ICONS: Record<string, React.ElementType> = {
  first_exam: Target,
  "5_exams": Zap,
  "10_exams": Star,
  "25_exams": Trophy,
  band_6: Award,
  band_7: Award,
  band_8: Trophy,
  practice_10: Target,
  practice_50: Star,
  book_1: Target,
  book_5: Star,
};

// Achievement colors
const ACHIEVEMENT_COLORS: Record<string, { bg: string; icon: string; border: string }> = {
  first_exam: { bg: "bg-blue-100 dark:bg-blue-900/30", icon: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800" },
  "5_exams": { bg: "bg-green-100 dark:bg-green-900/30", icon: "text-green-600 dark:text-green-400", border: "border-green-200 dark:border-green-800" },
  "10_exams": { bg: "bg-purple-100 dark:bg-purple-900/30", icon: "text-purple-600 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800" },
  "25_exams": { bg: "bg-amber-100 dark:bg-amber-900/30", icon: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800" },
  band_6: { bg: "bg-emerald-100 dark:bg-emerald-900/30", icon: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
  band_7: { bg: "bg-indigo-100 dark:bg-indigo-900/30", icon: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-800" },
  band_8: { bg: "bg-rose-100 dark:bg-rose-900/30", icon: "text-rose-600 dark:text-rose-400", border: "border-rose-200 dark:border-rose-800" },
  practice_10: { bg: "bg-cyan-100 dark:bg-cyan-900/30", icon: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-200 dark:border-cyan-800" },
  practice_50: { bg: "bg-teal-100 dark:bg-teal-900/30", icon: "text-teal-600 dark:text-teal-400", border: "border-teal-200 dark:border-teal-800" },
  book_1: { bg: "bg-orange-100 dark:bg-orange-900/30", icon: "text-orange-600 dark:text-orange-400", border: "border-orange-200 dark:border-orange-800" },
  book_5: { bg: "bg-pink-100 dark:bg-pink-900/30", icon: "text-pink-600 dark:text-pink-400", border: "border-pink-200 dark:border-pink-800" },
};

const defaultColors = { bg: "bg-gray-100 dark:bg-gray-900/30", icon: "text-gray-600 dark:text-gray-400", border: "border-gray-200 dark:border-gray-800" };

export default function AchievementsCard({ achievements }: AchievementsCardProps) {
  const unlockedAchievements = achievements.achievements || [];
  const nextAchievements = achievements.next_achievements || [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Achievements</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {achievements.total_unlocked} unlocked
            </p>
          </div>
        </div>
      </div>

      {/* Unlocked Achievements */}
      {unlockedAchievements.length > 0 ? (
        <div className="space-y-3 mb-6">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Unlocked
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {unlockedAchievements.map((achievement) => {
              const Icon = ACHIEVEMENT_ICONS[achievement.id] || Award;
              const colors = ACHIEVEMENT_COLORS[achievement.id] || defaultColors;

              return (
                <div
                  key={achievement.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${colors.border} ${colors.bg}`}
                >
                  <div className={`p-2 rounded-lg ${colors.bg}`}>
                    <Icon className={`w-5 h-5 ${colors.icon}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {achievement.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {achievement.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-6 mb-6 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
          <Award className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Complete exams and practice to unlock achievements!
          </p>
        </div>
      )}

      {/* Progress to Next Achievements */}
      {nextAchievements.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            In Progress
          </h4>
          <div className="space-y-3">
            {nextAchievements.map((achievement) => {
              const progress = (achievement.progress / achievement.target) * 100;
              const colors = ACHIEVEMENT_COLORS[achievement.id] || defaultColors;

              return (
                <div
                  key={achievement.id}
                  className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {achievement.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {achievement.progress} / {achievement.target}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {achievements.stats && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {achievements.stats.total_exams}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Exams</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {achievements.stats.best_overall?.toFixed(1) || "-"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Best Score</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {achievements.stats.practice_sessions}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Practice</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {achievements.stats.books_completed}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Books</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
