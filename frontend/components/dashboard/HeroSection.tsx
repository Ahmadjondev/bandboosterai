"use client";

import Link from "next/link";
import { RefreshCw, Play, Flame, Target, TrendingUp } from "lucide-react";
import { formatScore, getBandInfo } from "@/types/dashboard";

interface HeroSectionProps {
  userName: string;
  currentScore: number | null;
  targetScore: number;
  streakDays: number;
  testsThisWeek: number;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function HeroSection({
  userName,
  currentScore,
  targetScore,
  streakDays,
  testsThisWeek,
  onRefresh,
  isRefreshing,
}: HeroSectionProps) {
  const bandInfo = getBandInfo(currentScore);
  const scoreGap = currentScore ? (targetScore - currentScore).toFixed(1) : targetScore.toFixed(1);
  const isOnTrack = currentScore !== null && currentScore >= targetScore - 0.5;

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6 sm:p-8 border border-gray-200 dark:border-transparent">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20 dark:opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 dark:bg-blue-500 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-400 dark:bg-purple-500 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="relative">
        {/* Top Row: Greeting & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-gray-500 dark:text-slate-400 text-sm font-medium mb-1">{getGreeting()}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {userName} 👋
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2.5 bg-gray-900/10 hover:bg-gray-900/20 dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-sm text-gray-700 dark:text-white rounded-xl transition-all disabled:opacity-50"
              aria-label="Refresh dashboard"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/dashboard/cd-exam"
              className="flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all font-medium shadow-lg shadow-blue-500/25"
            >
              <Play className="w-4 h-4" />
              <span>Start Test</span>
            </Link>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Current Score */}
          <div className="col-span-2 lg:col-span-1 bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-gray-200/50 dark:border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-500 dark:text-slate-400 text-sm font-medium">Current Score</span>
              <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${bandInfo.bgColor} ${bandInfo.color}`}>
                {bandInfo.label}
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold ${currentScore ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-500'}`}>
                {formatScore(currentScore)}
              </span>
              <span className="text-gray-400 dark:text-slate-500 text-sm">/ 9.0</span>
            </div>
          </div>

          {/* Target Progress */}
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-gray-200/50 dark:border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              <span className="text-gray-500 dark:text-slate-400 text-sm font-medium">Target</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{targetScore}</span>
              <span className={`text-sm ${isOnTrack ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {isOnTrack ? '✓ On track' : `${scoreGap} to go`}
              </span>
            </div>
          </div>

          {/* Streak */}
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-gray-200/50 dark:border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Flame className={`w-4 h-4 ${streakDays > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-gray-400 dark:text-slate-500'}`} />
              <span className="text-gray-500 dark:text-slate-400 text-sm font-medium">Streak</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{streakDays}</span>
              <span className="text-gray-400 dark:text-slate-500 text-sm">days</span>
            </div>
          </div>

          {/* This Week */}
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-gray-200/50 dark:border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span className="text-gray-500 dark:text-slate-400 text-sm font-medium">This Week</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{testsThisWeek}</span>
              <span className="text-gray-400 dark:text-slate-500 text-sm">tests</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
