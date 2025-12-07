'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SectionRadarChartProps {
  averages: {
    listening: number;
    reading: number;
    writing: number;
    speaking: number;
    overall: number;
  };
  strongestSection?: string | null;
  weakestSection?: string | null;
}

export function SectionRadarChart({ averages, strongestSection, weakestSection }: SectionRadarChartProps) {
  const sections = [
    { key: 'listening', label: 'Listening', icon: '🎧' },
    { key: 'reading', label: 'Reading', icon: '📖' },
    { key: 'writing', label: 'Writing', icon: '✍️' },
    { key: 'speaking', label: 'Speaking', icon: '🎤' },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 6) return 'text-green-600 dark:text-green-400';
    if (score >= 5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getBarColor = (score: number) => {
    if (score >= 7) return 'bg-emerald-500';
    if (score >= 6) return 'bg-green-500';
    if (score >= 5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Overall Average</div>
        <div className={`text-4xl font-bold ${getScoreColor(averages.overall)}`}>
          {averages.overall.toFixed(1)}
        </div>
      </div>

      {/* Section Bars */}
      <div className="space-y-3">
        {sections.map((section) => {
          const score = averages[section.key as keyof typeof averages];
          const barWidth = (score / 9) * 100;
          const isStrongest = strongestSection === section.key;
          const isWeakest = weakestSection === section.key;
          
          return (
            <div key={section.key} className="relative">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{section.icon}</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {section.label}
                  </span>
                  {isStrongest && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full">
                      <TrendingUp className="h-3 w-3" />
                      Best
                    </span>
                  )}
                  {isWeakest && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                      <TrendingDown className="h-3 w-3" />
                      Focus
                    </span>
                  )}
                </div>
                <span className={`text-lg font-bold ${getScoreColor(score)}`}>
                  {score.toFixed(1)}
                </span>
              </div>
              <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getBarColor(score)} transition-all duration-500 rounded-full`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
