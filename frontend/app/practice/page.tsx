'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Headphones, 
  BookOpen, 
  PenTool, 
  Mic, 
  ChevronRight, 
  Trophy, 
  Clock, 
  Target,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { 
  getSectionTypesOverview, 
  getUserStats, 
  getSectionIcon 
} from '@/lib/api/section-practice';
import type { SectionTypeOverview, UserStatsResponse } from '@/types/section-practice';

const sectionIcons = {
  LISTENING: Headphones,
  READING: BookOpen,
  WRITING: PenTool,
  SPEAKING: Mic,
};

const sectionColors = {
  LISTENING: {
    bg: 'bg-blue-500',
    light: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    gradient: 'from-blue-500 to-cyan-500',
  },
  READING: {
    bg: 'bg-green-500',
    light: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
    gradient: 'from-green-500 to-emerald-500',
  },
  WRITING: {
    bg: 'bg-purple-500',
    light: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
    gradient: 'from-purple-500 to-pink-500',
  },
  SPEAKING: {
    bg: 'bg-orange-500',
    light: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
    gradient: 'from-orange-500 to-amber-500',
  },
};

export default function SectionPracticePage() {
  const [overview, setOverview] = useState<SectionTypeOverview[]>([]);
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [overviewData, statsData] = await Promise.all([
        getSectionTypesOverview(),
        getUserStats(),
      ]);
      setOverview(overviewData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">Loading section practice...</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Preparing your practice sessions</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">❌</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Failed to load</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Section Practice
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Practice individual IELTS sections to improve specific skills
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.overall.total_completed}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.overall.average_score?.toFixed(1) || '-'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Score</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.overall.total_time_minutes}m
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Time Spent</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {overview.reduce((acc, s) => acc + s.total_practices, 0)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Available</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {overview.map((section) => {
            const Icon = sectionIcons[section.section_type];
            const colors = sectionColors[section.section_type];

            return (
              <Link
                key={section.section_type}
                href={`/practice/${section.section_type.toLowerCase()}`}
                className="group"
              >
                <div className={`bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border ${colors.border} hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 ${colors.light} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-7 h-7 ${colors.text}`} />
                    </div>
                    <div className="flex items-center gap-2">
                      {section.free_practices > 0 && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                          {section.free_practices} Free
                        </span>
                      )}
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {section.display_name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {section.total_practices} practice {section.total_practices === 1 ? 'session' : 'sessions'} available
                  </p>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Progress</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {section.completed_practices}/{section.total_practices}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-linear-to-r ${colors.gradient} transition-all duration-500`}
                        style={{ width: `${section.progress_percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span className="text-gray-600 dark:text-gray-400">
                        Best: {section.best_score?.toFixed(1) || '-'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="w-4 h-4 text-blue-500" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {section.total_attempts} attempts
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Empty State */}
        {overview.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No practice sessions available
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Check back later for new practice content.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
