"use client";

import { formatScore, getBandInfo, calculateProgress } from "@/types/dashboard";
import { Headphones, BookOpen, PenTool, Mic } from "lucide-react";

interface SectionData {
  average_score: number | null;
  tests_count: number;
  best_score?: number | null;
  progress?: number;
}

interface ScoreOverviewProps {
  sections: {
    listening: SectionData;
    reading: SectionData;
    writing: SectionData;
    speaking: SectionData;
  };
  targetScore: number;
  overallAverage: number | null;
}

const sectionConfig = {
  listening: {
    name: "Listening",
    icon: Headphones,
    gradient: "from-sky-500 to-blue-600",
    bg: "bg-sky-50 dark:bg-sky-900/20",
    ring: "ring-sky-500",
  },
  reading: {
    name: "Reading",
    icon: BookOpen,
    gradient: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    ring: "ring-emerald-500",
  },
  writing: {
    name: "Writing",
    icon: PenTool,
    gradient: "from-violet-500 to-purple-600",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    ring: "ring-violet-500",
  },
  speaking: {
    name: "Speaking",
    icon: Mic,
    gradient: "from-rose-500 to-pink-600",
    bg: "bg-rose-50 dark:bg-rose-900/20",
    ring: "ring-rose-500",
  },
};

function CircularProgress({ 
  score, 
  targetScore, 
  gradient,
  size = 80,
}: { 
  score: number | null; 
  targetScore: number;
  gradient: string;
  size?: number;
}) {
  const progress = calculateProgress(score, targetScore);
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Background circle */}
      <svg className="absolute transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200 dark:text-slate-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" className={`${gradient.includes('sky') ? 'stop-color: rgb(14,165,233)' : gradient.includes('emerald') ? 'stop-color: rgb(16,185,129)' : gradient.includes('violet') ? 'stop-color: rgb(139,92,246)' : 'stop-color: rgb(244,63,94)'}`} style={{ stopColor: 'currentColor' }} />
            <stop offset="100%" className="text-blue-600" style={{ stopColor: 'currentColor' }} />
          </linearGradient>
        </defs>
      </svg>
      {/* Score text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-slate-900 dark:text-white">
          {formatScore(score)}
        </span>
      </div>
    </div>
  );
}

function SectionCard({
  sectionKey,
  data,
  targetScore,
}: {
  sectionKey: keyof typeof sectionConfig;
  data: SectionData;
  targetScore: number;
}) {
  const config = sectionConfig[sectionKey];
  const Icon = config.icon;
  const bandInfo = getBandInfo(data.average_score);
  const gap = data.average_score 
    ? Math.max(0, targetScore - data.average_score).toFixed(1) 
    : targetScore.toFixed(1);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl bg-linear-to-br ${config.gradient} shadow-lg`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {config.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {data.tests_count} {data.tests_count === 1 ? "test" : "tests"} taken
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${bandInfo.color}`}>
              {formatScore(data.average_score)}
            </span>
            {data.best_score && data.best_score !== data.average_score && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Best: {data.best_score.toFixed(1)}
              </span>
            )}
          </div>
          
          {data.average_score !== null ? (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                data.average_score >= targetScore 
                  ? 'bg-emerald-500' 
                  : data.average_score >= targetScore - 1 
                    ? 'bg-amber-500' 
                    : 'bg-red-500'
              }`} />
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {data.average_score >= targetScore 
                  ? 'Target reached!' 
                  : `${gap} pts to target`}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-500">No tests yet</span>
          )}
        </div>

        {/* Mini progress bar */}
        <div className="w-16 h-16 relative">
          <svg className="transform -rotate-90 w-16 h-16">
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-slate-100 dark:text-slate-700"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={175.93}
              strokeDashoffset={175.93 - (calculateProgress(data.average_score, targetScore) / 100) * 175.93}
              className={`${
                data.average_score && data.average_score >= targetScore 
                  ? 'stroke-emerald-500' 
                  : data.average_score && data.average_score >= targetScore - 1
                    ? 'stroke-amber-500'
                    : 'stroke-blue-500'
              } transition-all duration-500`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {calculateProgress(data.average_score, targetScore)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ScoreOverview({ sections, targetScore, overallAverage }: ScoreOverviewProps) {
  const bandInfo = getBandInfo(overallAverage);

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <div className="bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              Overall Band Score
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Average across all sections
            </p>
            <div className="flex items-center gap-3">
              <span className={`text-5xl font-bold ${bandInfo.color}`}>
                {formatScore(overallAverage)}
              </span>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${bandInfo.bgColor} ${bandInfo.color} ${bandInfo.borderColor} border`}>
                {bandInfo.label}
              </div>
            </div>
          </div>
          
          {/* Visual Target Indicator */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-400 dark:text-slate-500 mb-1">
                {targetScore}
              </div>
              <div className="text-xs text-slate-500">Target</div>
            </div>
            <div className="w-px h-12 bg-slate-200 dark:bg-slate-700" />
            <div className="text-center">
              <div className={`text-3xl font-bold ${
                overallAverage && overallAverage >= targetScore 
                  ? 'text-emerald-500' 
                  : 'text-amber-500'
              } mb-1`}>
                {overallAverage 
                  ? Math.max(0, targetScore - overallAverage).toFixed(1)
                  : targetScore.toFixed(1)}
              </div>
              <div className="text-xs text-slate-500">Gap</div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(Object.keys(sectionConfig) as Array<keyof typeof sectionConfig>).map((key) => (
          <SectionCard
            key={key}
            sectionKey={key}
            data={sections[key]}
            targetScore={targetScore}
          />
        ))}
      </div>
    </div>
  );
}
