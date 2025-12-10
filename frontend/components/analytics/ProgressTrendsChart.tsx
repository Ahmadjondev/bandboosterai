"use client";

import { AnalyticsProgressTrends } from "@/lib/exam-api";
import { TrendingUp, TrendingDown, Activity, Calendar, ChevronDown } from "lucide-react";
import { useState, useMemo } from "react";

interface ProgressTrendsChartProps {
  progress: AnalyticsProgressTrends;
}

const SECTION_COLORS = {
  reading: "#10b981",    // emerald
  listening: "#3b82f6",  // blue
  writing: "#a855f7",    // purple
  speaking: "#f59e0b",   // amber
  overall: "#6366f1",    // indigo
};

export default function ProgressTrendsChart({ progress }: ProgressTrendsChartProps) {
  const [activeSection, setActiveSection] = useState<keyof typeof SECTION_COLORS>("overall");
  const [showAll, setShowAll] = useState(false);

  const { trends, improvement_rate } = progress;

  // Process data for chart
  const chartData = useMemo(() => {
    if (!trends || trends.length === 0) return [];
    return trends.map((trend) => ({
      ...trend,
      displayDate: new Date(trend.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    }));
  }, [trends]);

  // Get min/max for scaling
  const { minScore, maxScore } = useMemo(() => {
    if (chartData.length === 0) return { minScore: 0, maxScore: 9 };
    let min = 9;
    let max = 0;
    chartData.forEach((d) => {
      const value = d[activeSection] as number | null;
      if (value !== null) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    });
    return { minScore: Math.max(0, min - 0.5), maxScore: Math.min(9, max + 0.5) };
  }, [chartData, activeSection]);

  const getImprovementBadge = (rate: number) => {
    if (rate > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
          <TrendingUp className="w-3 h-3" />
          +{rate.toFixed(1)}%
        </span>
      );
    } else if (rate < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
          <TrendingDown className="w-3 h-3" />
          {rate.toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
        No change
      </span>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
            <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Progress Trends</h3>
        </div>
        <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Complete more tests to see your progress trends</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
            <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Progress Trends</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{progress.time_period}</p>
          </div>
        </div>

        {/* Section Selector */}
        <div className="relative">
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: SECTION_COLORS[activeSection] }}
            />
            <span className="capitalize">{activeSection}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showAll ? "rotate-180" : ""}`} />
          </button>

          {showAll && (
            <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 py-1">
              {(Object.keys(SECTION_COLORS) as Array<keyof typeof SECTION_COLORS>).map((section) => (
                <button
                  key={section}
                  onClick={() => {
                    setActiveSection(section);
                    setShowAll(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: SECTION_COLORS[section] }}
                  />
                  <span className="capitalize">{section}</span>
                  {getImprovementBadge(improvement_rate[section])}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-48 mb-6">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{maxScore.toFixed(1)}</span>
          <span>{((maxScore + minScore) / 2).toFixed(1)}</span>
          <span>{minScore.toFixed(1)}</span>
        </div>

        {/* Chart area */}
        <div className="ml-10 h-full relative border-l border-b border-gray-200 dark:border-gray-700">
          {/* Grid lines */}
          <div className="absolute inset-0">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="absolute w-full border-t border-gray-100 dark:border-gray-800"
                style={{ top: `${(i / 2) * 100}%` }}
              />
            ))}
          </div>

          {/* Data line */}
          <svg className="absolute inset-0 w-full h-full overflow-visible">
            {/* Area fill */}
            <defs>
              <linearGradient id={`gradient-${activeSection}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={SECTION_COLORS[activeSection]} stopOpacity="0.3" />
                <stop offset="100%" stopColor={SECTION_COLORS[activeSection]} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={chartData
                .map((d, i) => {
                  const value = d[activeSection] as number | null;
                  if (value === null) return "";
                  const x = (i / Math.max(chartData.length - 1, 1)) * 100;
                  const y = ((maxScore - value) / (maxScore - minScore)) * 100;
                  return i === 0 ? `M ${x}% ${y}%` : `L ${x}% ${y}%`;
                })
                .join(" ") + ` L 100% 100% L 0% 100% Z`}
              fill={`url(#gradient-${activeSection})`}
            />
            <polyline
              fill="none"
              stroke={SECTION_COLORS[activeSection]}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={chartData
                .map((d, i) => {
                  const value = d[activeSection] as number | null;
                  if (value === null) return null;
                  const x = (i / Math.max(chartData.length - 1, 1)) * 100;
                  const y = ((maxScore - value) / (maxScore - minScore)) * 100;
                  return `${x}%,${y}%`;
                })
                .filter(Boolean)
                .join(" ")}
            />

            {/* Data points */}
            {chartData.map((d, i) => {
              const value = d[activeSection] as number | null;
              if (value === null) return null;
              const x = (i / Math.max(chartData.length - 1, 1)) * 100;
              const y = ((maxScore - value) / (maxScore - minScore)) * 100;
              return (
                <g key={i}>
                  <circle
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r="6"
                    fill="white"
                    stroke={SECTION_COLORS[activeSection]}
                    strokeWidth="2"
                    className="cursor-pointer hover:r-8 transition-all"
                  />
                  <title>{`${d.displayDate}: ${value.toFixed(1)}`}</title>
                </g>
              );
            })}
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between ml-10 mt-2 text-xs text-gray-500 dark:text-gray-400">
          {chartData.slice(0, 5).map((d, i) => (
            <span key={i}>{d.displayDate}</span>
          ))}
          {chartData.length > 5 && <span>{chartData[chartData.length - 1].displayDate}</span>}
        </div>
      </div>

      {/* Improvement Rates */}
      <div className="grid grid-cols-5 gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        {(Object.entries(improvement_rate) as [keyof typeof SECTION_COLORS, number][]).map(
          ([section, rate]) => (
            <div key={section} className="text-center">
              <div
                className="w-2 h-2 rounded-full mx-auto mb-1"
                style={{ backgroundColor: SECTION_COLORS[section] }}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mb-1">{section}</p>
              {getImprovementBadge(rate)}
            </div>
          )
        )}
      </div>
    </div>
  );
}
