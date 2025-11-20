"use client";

import { LearningVelocity } from "@/lib/exam-api";
import { Zap, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface LearningVelocityCardProps {
  velocity: LearningVelocity;
}

export default function LearningVelocityCard({ velocity }: LearningVelocityCardProps) {
  const getTrendIcon = () => {
    switch (velocity.trend) {
      case "improving":
        return <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />;
      case "declining":
        return <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />;
      case "stable":
        return <Minus className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />;
      default:
        return <Zap className="w-6 h-6 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getTrendColor = () => {
    switch (velocity.trend) {
      case "improving":
        return "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20";
      case "declining":
        return "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20";
      case "stable":
        return "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20";
      default:
        return "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20";
    }
  };

  const getTrendText = () => {
    switch (velocity.trend) {
      case "improving":
        return "You're improving!";
      case "declining":
        return "Need more practice";
      case "stable":
        return "Maintaining level";
      default:
        return "Keep practicing";
    }
  };

  return (
    <div className={`rounded-lg border ${getTrendColor()} p-6`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
          <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Learning Velocity
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {getTrendText()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-center gap-1 mb-1">
            {getTrendIcon()}
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {velocity.velocity > 0 ? "+" : ""}{velocity.velocity}
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Velocity Score
          </div>
        </div>

        <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {velocity.improvement_rate > 0 ? "+" : ""}{velocity.improvement_rate}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Points Change
          </div>
        </div>
      </div>

      {velocity.recent_avg && velocity.previous_avg && (
        <div className="flex items-center justify-between text-sm p-3 bg-white dark:bg-gray-800 rounded-lg">
          <div>
            <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">Previous</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {velocity.previous_avg}
            </div>
          </div>
          <div className="text-gray-400">→</div>
          <div className="text-right">
            <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">Recent</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {velocity.recent_avg}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
