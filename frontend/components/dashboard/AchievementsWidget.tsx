"use client";

import { Achievement } from "@/lib/exam-api";
import { Trophy, Lock, Star } from "lucide-react";

interface AchievementsWidgetProps {
  achievements: Achievement[];
}

export default function AchievementsWidget({ achievements }: AchievementsWidgetProps) {
  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const nextAchievements = achievements.filter(a => !a.unlocked).slice(0, 2);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Achievements
        </h2>
        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-sm font-medium">
          {unlockedAchievements.length}
        </span>
      </div>

      {/* Unlocked Achievements */}
      {unlockedAchievements.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Earned Achievements
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {unlockedAchievements.slice(0, 4).map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-center gap-3 p-3 bg-linear-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
              >
                <div className="text-2xl">{achievement.icon}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                    {achievement.title}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {achievement.description}
                  </p>
                </div>
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Achievements */}
      {nextAchievements.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Next Milestones
          </h3>
          <div className="space-y-3">
            {nextAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="text-2xl opacity-60">{achievement.icon}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                    {achievement.title}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    {achievement.description}
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className="bg-linear-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${achievement.progress}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {Math.round(achievement.progress)}% complete
                  </div>
                </div>
                <Lock className="w-4 h-4 text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      {achievements.length === 0 && (
        <div className="text-center py-8">
          <Trophy className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            Complete your first test to start earning achievements!
          </p>
        </div>
      )}
    </div>
  );
}
