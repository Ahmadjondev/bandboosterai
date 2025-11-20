"use client";

import { PerformanceInsights as PerformanceInsightsType } from "@/lib/exam-api";
import { Brain, Clock, Target, TrendingUp } from "lucide-react";

interface PerformanceInsightsProps {
  insights: PerformanceInsightsType;
}

export default function PerformanceInsights({ insights }: PerformanceInsightsProps) {
  const formatStudyTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    if (hours < 1) return `${minutes}m`;
    if (hours < 24) return `${hours}h ${minutes % 60}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };

  const getConsistencyColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getConsistencyBg = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Performance Insights
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strongest Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h3 className="font-medium text-gray-900 dark:text-white">Strongest Section</h3>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            {insights.strongest_section ? (
              <div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300 capitalize">
                  {insights.strongest_section}
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Your best performing section
                </p>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                Complete more tests to identify your strongest section
              </p>
            )}
          </div>
        </div>

        {/* Improvement Needed */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h3 className="font-medium text-gray-900 dark:text-white">Focus Area</h3>
          </div>
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            {insights.improvement_needed ? (
              <div>
                <div className="text-2xl font-bold text-orange-700 dark:text-orange-300 capitalize">
                  {insights.improvement_needed}
                </div>
                <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                  Needs more practice
                </p>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                All sections performing well
              </p>
            )}
          </div>
        </div>

        {/* Study Time */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-medium text-gray-900 dark:text-white">Total Study Time</h3>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {formatStudyTime(insights.total_study_time)}
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              Estimated practice time
            </p>
          </div>
        </div>

        {/* Consistency Score */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="font-medium text-gray-900 dark:text-white">Consistency</h3>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className={`text-2xl font-bold ${getConsistencyColor(insights.consistency_score)}`}>
                  {Math.round(insights.consistency_score)}%
                </div>
                <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                  Study consistency
                </p>
              </div>
              <div className="w-16 h-16 relative">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200 dark:text-gray-700"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={getConsistencyColor(insights.consistency_score)}
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${insights.consistency_score}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
