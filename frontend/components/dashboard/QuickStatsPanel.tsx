"use client";

import { QuickStats } from "@/lib/exam-api";
import { Award, TrendingUp, Target, Calendar } from "lucide-react";

interface QuickStatsPanelProps {
  stats: QuickStats;
}

export default function QuickStatsPanel({ stats }: QuickStatsPanelProps) {
  const quickStats = [
    {
      icon: <Award className="w-6 h-6" />,
      label: "Best Score",
      value: stats.best_score > 0 ? stats.best_score.toFixed(1) : "--",
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
      borderColor: "border-yellow-200 dark:border-yellow-800"
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      label: "Avg Improvement",
      value: stats.average_improvement > 0 
        ? `+${stats.average_improvement.toFixed(2)}` 
        : stats.average_improvement.toFixed(2),
      color: stats.average_improvement >= 0 
        ? "text-green-600 dark:text-green-400" 
        : "text-red-600 dark:text-red-400",
      bgColor: stats.average_improvement >= 0 
        ? "bg-green-50 dark:bg-green-900/20" 
        : "bg-red-50 dark:bg-red-900/20",
      borderColor: stats.average_improvement >= 0 
        ? "border-green-200 dark:border-green-800" 
        : "border-red-200 dark:border-red-800"
    },
    {
      icon: <Target className="w-6 h-6" />,
      label: "Consistency",
      value: `${stats.practice_consistency}%`,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      borderColor: "border-purple-200 dark:border-purple-800"
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      label: "This Month",
      value: `${stats.tests_this_month} tests`,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      borderColor: "border-blue-200 dark:border-blue-800"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {quickStats.map((stat, index) => (
        <div
          key={index}
          className={`${stat.bgColor} border ${stat.borderColor} rounded-lg p-4 transition-transform hover:scale-105`}
        >
          <div className={`${stat.color} mb-3`}>
            {stat.icon}
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {stat.value}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
