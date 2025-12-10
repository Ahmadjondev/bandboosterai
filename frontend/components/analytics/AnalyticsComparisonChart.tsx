"use client";

import { AnalyticsOverview } from "@/lib/exam-api";
import { BarChart3, BookOpen, Headphones, Pen, MessageCircle } from "lucide-react";

interface AnalyticsComparisonChartProps {
  overview: AnalyticsOverview;
}

const SECTIONS = [
  { key: "reading" as const, name: "Reading", icon: BookOpen, color: "#10b981" },
  { key: "listening" as const, name: "Listening", icon: Headphones, color: "#3b82f6" },
  { key: "writing" as const, name: "Writing", icon: Pen, color: "#a855f7" },
  { key: "speaking" as const, name: "Speaking", icon: MessageCircle, color: "#f59e0b" },
];

export default function AnalyticsComparisonChart({ overview }: AnalyticsComparisonChartProps) {
  const { section_averages, target_band } = overview;

  const maxValue = 9;

  // Find strongest and weakest sections
  const validScores = SECTIONS.filter((s) => section_averages[s.key] !== null);
  const sortedByScore = [...validScores].sort(
    (a, b) => (section_averages[b.key] || 0) - (section_averages[a.key] || 0)
  );
  const strongest = sortedByScore[0]?.key;
  const weakest = sortedByScore[sortedByScore.length - 1]?.key;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
          <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Section Comparison</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Compare your performance across all sections</p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="space-y-4 mb-6">
        {SECTIONS.map((section) => {
          const score = section_averages[section.key];
          const percentage = score ? (score / maxValue) * 100 : 0;
          const targetPercentage = (target_band / maxValue) * 100;
          const isStrongest = section.key === strongest;
          const isWeakest = section.key === weakest && validScores.length > 1;
          const Icon = section.icon;

          return (
            <div key={section.key} className="space-y-2">
              {/* Section Label */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color: section.color }} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {section.name}
                  </span>
                  {isStrongest && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      Strongest
                    </span>
                  )}
                  {isWeakest && score && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                      Focus area
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {score?.toFixed(1) || "—"}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-6 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                {/* Target marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                  style={{ left: `${targetPercentage}%` }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] text-red-600 dark:text-red-400 font-medium">
                    Target
                  </div>
                </div>

                {/* Score bar */}
                <div
                  className="h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: section.color,
                    opacity: score ? 1 : 0.3,
                  }}
                >
                  {percentage > 15 && (
                    <span className="text-xs font-medium text-white">
                      {score?.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scale */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
        <span>0</span>
        <span>3</span>
        <span>6</span>
        <span>9</span>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-300 dark:bg-gray-600" />
          <span className="text-xs text-gray-600 dark:text-gray-400">Current Score</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-3 bg-red-500" />
          <span className="text-xs text-gray-600 dark:text-gray-400">Target ({target_band})</span>
        </div>
      </div>
    </div>
  );
}
