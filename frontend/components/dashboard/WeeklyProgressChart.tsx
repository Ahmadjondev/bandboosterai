"use client";

import { WeeklyProgress } from "@/lib/exam-api";
import { TrendingUp, TrendingDown, Minus, Calendar, BarChart3 } from "lucide-react";

interface WeeklyProgressChartProps {
  weeklyProgress: WeeklyProgress;
}

export default function WeeklyProgressChart({ weeklyProgress }: WeeklyProgressChartProps) {
  const { weekly_data, trend } = weeklyProgress;
  
  const getTrendIcon = () => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case "declining":
        return <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />;
      default:
        return <Minus className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case "improving":
        return "text-green-600 dark:text-green-400";
      case "declining":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const maxScore = Math.max(...weekly_data.map(w => w.average_score || 0));
  const maxTests = Math.max(...weekly_data.map(w => w.tests_completed));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Weekly Progress
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {getTrendIcon()}
          <span className={`text-sm font-medium capitalize ${getTrendColor()}`}>
            {trend}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="space-y-4">
        {weekly_data.map((week, index) => {
          const weekStart = new Date(week.week_start);
          const weekEnd = new Date(week.week_end);
          const scoreHeight = week.average_score ? (week.average_score / 9) * 100 : 0;
          const testHeight = maxTests > 0 ? (week.tests_completed / maxTests) * 100 : 0;

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {" "}
                    {weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-600 dark:text-gray-400">
                    {week.tests_completed} test{week.tests_completed !== 1 ? "s" : ""}
                  </span>
                  {week.average_score && (
                    <span className="font-medium text-gray-900 dark:text-white">
                      {week.average_score.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 h-8">
                {/* Tests completed bar */}
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${testHeight}%` }}
                  ></div>
                </div>

                {/* Score bar */}
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      week.average_score
                        ? week.average_score >= 7
                          ? "bg-green-500"
                          : week.average_score >= 5.5
                          ? "bg-yellow-500"
                          : "bg-red-500"
                        : "bg-gray-400"
                    }`}
                    style={{ width: `${scoreHeight}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Tests Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Average Score</span>
        </div>
      </div>

      {weekly_data.every(w => w.tests_completed === 0) && (
        <div className="text-center py-8">
          <BarChart3 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            No test data available for the past 4 weeks
          </p>
        </div>
      )}
    </div>
  );
}
