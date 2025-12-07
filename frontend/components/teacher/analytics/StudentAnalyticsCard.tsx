'use client';

import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { StudentAnalytics } from '@/types/teacher';

interface StudentAnalyticsCardProps {
  student: StudentAnalytics;
}

export function StudentAnalyticsCard({ student }: StudentAnalyticsCardProps) {
  const getTrendIcon = () => {
    switch (student.progress_trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTrendLabel = () => {
    switch (student.progress_trend) {
      case 'improving':
        return 'Improving';
      case 'declining':
        return 'Needs attention';
      default:
        return 'Stable';
    }
  };

  const getTrendBg = () => {
    switch (student.progress_trend) {
      case 'improving':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'declining':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-gray-400';
    if (score >= 7) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 6) return 'text-green-600 dark:text-green-400';
    if (score >= 5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all group">
      <div className="flex items-start justify-between mb-4">
        {/* Student Info */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
            {student.profile_image ? (
              <img
                src={student.profile_image}
                alt={student.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              student.full_name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {student.full_name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {student.email}
            </p>
          </div>
        </div>

        {/* Trend Badge */}
        <span className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getTrendBg()}`}>
          {getTrendIcon()}
          {getTrendLabel()}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tests</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {student.graded_attempts}
          </div>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg</div>
          <div className={`text-lg font-bold ${getScoreColor(student.average_score)}`}>
            {student.average_score?.toFixed(1) || '-'}
          </div>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Best</div>
          <div className={`text-lg font-bold ${getScoreColor(student.best_score)}`}>
            {student.best_score?.toFixed(1) || '-'}
          </div>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Latest</div>
          <div className={`text-lg font-bold ${getScoreColor(student.latest_score)}`}>
            {student.latest_score?.toFixed(1) || '-'}
          </div>
        </div>
      </div>

      {/* Section Averages */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">Sections:</span>
        <div className="flex items-center gap-3 flex-1">
          {[
            { key: 'listening', label: 'L', icon: '🎧' },
            { key: 'reading', label: 'R', icon: '📖' },
            { key: 'writing', label: 'W', icon: '✍️' },
            { key: 'speaking', label: 'S', icon: '🎤' },
          ].map((section) => {
            const score = student.section_averages[section.key as keyof typeof student.section_averages];
            return (
              <div
                key={section.key}
                className="flex items-center gap-1 text-xs"
                title={`${section.key.charAt(0).toUpperCase() + section.key.slice(1)}: ${score?.toFixed(1) || '-'}`}
              >
                <span>{section.icon}</span>
                <span className={`font-semibold ${getScoreColor(score)}`}>
                  {score?.toFixed(1) || '-'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Last Activity & View Details */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Last active: {student.last_activity 
            ? new Date(student.last_activity).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })
            : 'Never'}
        </span>
        <button className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium group-hover:underline">
          View Details
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

interface StudentAnalyticsListProps {
  students: StudentAnalytics[];
}

export function StudentAnalyticsList({ students }: StudentAnalyticsListProps) {
  if (students.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No student data available yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {students.map((student) => (
        <StudentAnalyticsCard key={student.id} student={student} />
      ))}
    </div>
  );
}
