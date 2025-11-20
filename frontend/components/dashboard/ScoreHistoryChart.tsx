"use client";

import { ScoreHistoryItem } from "@/lib/exam-api";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface ScoreHistoryChartProps {
  history: ScoreHistoryItem[];
}

export default function ScoreHistoryChart({ history }: ScoreHistoryChartProps) {
  if (history.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Score History
        </h2>
        <div className="text-center py-12">
          <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            Complete tests to see your score progression
          </p>
        </div>
      </div>
    );
  }

  const maxScore = 9;
  const minScore = 0;
  const scoreRange = maxScore - minScore;
  
  // Calculate trend
  const recentScores = history.slice(-5).filter(h => h.overall !== null);
  const trend = recentScores.length >= 2 && 
    recentScores[recentScores.length - 1].overall! > recentScores[0].overall!;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Score Progression
          </h2>
        </div>
        {recentScores.length >= 2 && (
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
            trend 
              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
              : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
          }`}>
            {trend ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {trend ? "Improving" : "Declining"}
            </span>
          </div>
        )}
      </div>

      {/* Chart Area */}
      <div className="relative h-64 mb-4">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 pr-2">
          <span>9.0</span>
          <span>6.0</span>
          <span>3.0</span>
          <span>0.0</span>
        </div>

        {/* Grid lines */}
        <div className="absolute left-12 right-0 top-0 bottom-0">
          <div className="h-full grid grid-rows-4 border-l border-gray-200 dark:border-gray-700">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="border-t border-gray-200 dark:border-gray-700" />
            ))}
          </div>

          {/* Score lines */}
          <svg className="absolute inset-0 w-full h-full">
            {/* Overall score line */}
            <polyline
              fill="none"
              stroke="rgb(59, 130, 246)"
              strokeWidth="2"
              points={history
                .map((item, index) => {
                  if (item.overall === null) return null;
                  const x = (index / (history.length - 1 || 1)) * 100;
                  const y = ((maxScore - item.overall) / scoreRange) * 100;
                  return `${x}%,${y}%`;
                })
                .filter(Boolean)
                .join(" ")}
            />

            {/* Data points */}
            {history.map((item, index) => {
              if (item.overall === null) return null;
              const x = (index / (history.length - 1 || 1)) * 100;
              const y = ((maxScore - item.overall) / scoreRange) * 100;
              
              return (
                <g key={index}>
                  <circle
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r="4"
                    fill="white"
                    stroke="rgb(59, 130, 246)"
                    strokeWidth="2"
                    className="hover:r-6 transition-all cursor-pointer"
                  />
                  <title>{`${item.test_name}\nScore: ${item.overall}\nDate: ${new Date(item.date).toLocaleDateString()}`}</title>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* X-axis - Test numbers */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 pl-12">
        <span>Test 1</span>
        <span>Latest</span>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-blue-500"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Overall Score</span>
        </div>
        {recentScores.length >= 2 && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Latest: <span className="font-semibold text-gray-900 dark:text-white">
              {recentScores[recentScores.length - 1].overall?.toFixed(1)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
