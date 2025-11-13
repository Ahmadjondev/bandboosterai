'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  Users,
  CheckSquare,
  Award,
  BookOpen,
  Headphones,
  Edit3,
  Mic,
  TrendingUp,
  Clock,
  UserPlus,
  Trophy,
  RefreshCw,
} from 'lucide-react';
import { managerAPI } from '@/lib/manager/api-client';
import {
  formatRelativeTime,
  getInitials,
  getBandScoreColor,
  getRankBadgeColor,
  getSectionIcon,
} from '@/lib/manager/utils';
import { LoadingSpinner, Alert } from '@/components/manager/shared';
import type {
  DashboardStats,
  PerformanceTrend,
  SectionPerformance,
} from '@/types/manager';

export default function ManagerDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await managerAPI.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      if (
        err.message === 'Authentication required' ||
        err.message === 'Redirecting to login'
      ) {
        return;
      }
      setError(err.message || 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const refreshDashboard = async () => {
    setRefreshing(true);
    await loadDashboardStats();
    setRefreshing(false);
  };

  const getScoreBarColor = (score: number): string => {
    if (score >= 8)
      return 'bg-linear-to-r from-green-500 to-green-600';
    if (score >= 7)
      return 'bg-linear-to-r from-primary to-primary/80';
    if (score >= 6)
      return 'bg-linear-to-r from-yellow-500 to-yellow-600';
    if (score >= 5)
      return 'bg-linear-to-r from-orange-500 to-orange-600';
    return 'bg-linear-to-r from-red-500 to-red-600';
  };

  const getDistributionColor = (band: string): string => {
    if (band === '9.0') return 'bg-emerald-500';
    if (band === '8.0-8.5') return 'bg-green-500';
    if (band === '7.0-7.5') return 'bg-primary';
    if (band === '6.0-6.5') return 'bg-yellow-500';
    if (band === '5.0-5.5') return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getPercentage = (count: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  if (loading) {
    return <LoadingSpinner size="large" />;
  }

  if (error) {
    return <Alert type="error" message={error} />;
  }

  if (!stats) {
    return <Alert type="info" message="No dashboard data available" />;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      {/* Header with Refresh */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Real-time overview of your IELTS management system
          </p>
        </div>
        <button
          onClick={refreshDashboard}
          disabled={refreshing}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
          />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Total Students */}
        <div className="bg-linear-to-br from-primary to-primary/80 overflow-hidden shadow-lg rounded-xl transform hover:scale-105 transition-transform duration-200">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="shrink-0">
                <div className="p-3 bg-primary/40 rounded-lg">
                  <Users className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-primary/10 text-white/80">
                  Total Students
                </p>
                <p className="mt-1 text-4xl font-bold text-white">
                  {stats.total_students}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-white/80">
                {stats.active_students} active
              </span>
              {stats.new_students_this_week > 0 && (
                <span className="text-white/80 font-medium">
                  +{stats.new_students_this_week} this week
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mock Exams */}
        <div className="bg-linear-to-br from-purple-500 to-purple-600 overflow-hidden shadow-lg rounded-xl transform hover:scale-105 transition-transform duration-200">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="shrink-0">
                <div className="p-3 bg-purple-400/40 rounded-lg">
                  <Activity className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white/80">Mock Exams</p>
                <p className="mt-1 text-4xl font-bold text-white">
                  {stats.total_mock_exams}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-white/80">
                {stats.active_mock_exams} active
              </span>
              {stats.upcoming_exams > 0 && (
                <span className="text-white/80 font-medium">
                  {stats.upcoming_exams} upcoming
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Completed Tests */}
        <div className="bg-linear-to-br from-green-500 to-green-600 overflow-hidden shadow-lg rounded-xl transform hover:scale-105 transition-transform duration-200">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="shrink-0">
                <div className="p-3 bg-green-400/40 rounded-lg">
                  <CheckSquare className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white/80">
                  Completed Tests
                </p>
                <p className="mt-1 text-4xl font-bold text-white">
                  {stats.total_results}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-white/80">
                {stats.results_this_month} this month
              </span>
              <span className="text-white/80 font-medium">
                {stats.completion_rate.toFixed(1)}% rate
              </span>
            </div>
          </div>
        </div>

        {/* Average Band Score */}
        <div className="bg-linear-to-br from-primary to-primary/80 overflow-hidden shadow-lg rounded-xl transform hover:scale-105 transition-transform duration-200">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="shrink-0">
                <div className="p-3 bg-primary/40 rounded-lg">
                  <Award className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white/80">
                  Average Band
                </p>
                <p className="mt-1 text-4xl font-bold text-white">
                  {stats.average_score}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-white/80">Overall average</span>
              <span className="text-white/80 font-medium">
                {stats.engagement_rate.toFixed(0)}% engaged
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Performance Trend Chart */}
        <div className="lg:col-span-2 bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-primary" />
              Performance Trend (Last 5 Weeks)
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats.performance_trend.map((week: PerformanceTrend) => (
                <div key={week.week} className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {week.week} ({week.date})
                    </span>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-gray-500">
                        {week.count} tests
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        Band {week.average_score}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      style={{ width: `${(week.average_score / 9) * 100}%` }}
                      className={`h-3 rounded-full transition-all duration-500 ease-out ${getScoreBarColor(
                        week.average_score
                      )}`}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Score Distribution */}
        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-purple-500" />
              Score Distribution
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {Object.entries(stats.score_distribution).map(([band, count]) => (
                <div
                  key={band}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${getDistributionColor(
                        band
                      )}`}
                    ></div>
                    <span className="text-sm font-medium text-gray-700">
                      Band {band}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{count}</span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        style={{
                          width: `${getPercentage(
                            count,
                            stats.total_results
                          )}%`,
                        }}
                        className={`h-2 rounded-full ${getDistributionColor(
                          band
                        )}`}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section Performance Grid */}
      <div className="mb-8">
        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-green-500" />
              Section-wise Performance
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.section_performance.map(
                (section: SectionPerformance) => (
                  <div
                    key={section.section}
                    className="bg-linear-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-700">
                        {section.section}
                      </h4>
                      {section.section === 'Listening' && (
                        <Headphones className="h-5 w-5 text-green-500" />
                      )}
                      {section.section === 'Reading' && (
                        <BookOpen className="h-5 w-5 text-blue-500" />
                      )}
                      {section.section === 'Writing' && (
                        <Edit3 className="h-5 w-5 text-purple-500" />
                      )}
                      {section.section === 'Speaking' && (
                        <Mic className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-1">
                      {section.average}
                    </p>
                    <p className="text-xs text-gray-500">
                      {section.total_tests} tests completed
                    </p>
                    <div className="mt-3 w-full bg-gray-300 rounded-full h-2">
                      <div
                        style={{
                          width: `${(section.average / 9) * 100}%`,
                        }}
                        className={`h-2 rounded-full bg-${section.color}-500`}
                      ></div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Library Overview */}
      <div className="mb-8">
        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-primary" />
              Content Library
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/10">
                <BookOpen className="h-8 w-8 mx-auto text-primary mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total_reading_passages}
                </p>
                <p className="text-xs text-gray-600">Reading Passages</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
                <Headphones className="h-8 w-8 mx-auto text-green-500 mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total_listening_parts}
                </p>
                <p className="text-xs text-gray-600">Listening Parts</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-100">
                <Edit3 className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total_writing_tasks}
                </p>
                <p className="text-xs text-gray-600">Writing Tasks</p>
              </div>
              <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/10">
                <Mic className="h-8 w-8 mx-auto text-primary mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total_speaking_topics}
                </p>
                <p className="text-xs text-gray-600">Speaking Topics</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity & Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Performers */}
        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-linear-to-r from-yellow-50 to-orange-50">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
              Top Performers (30 Days)
            </h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {stats.top_performers && stats.top_performers.length > 0 ? (
              stats.top_performers.map((performer, index) => (
                <li
                  key={performer.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getRankBadgeColor(
                        index
                      )}`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {performer.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {performer.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${getBandScoreColor(
                          performer.score
                        )}`}
                      >
                        {performer.score}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatRelativeTime(performer.date)}
                      </p>
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-6 py-8 text-center text-gray-500">
                <Award className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm">No results yet</p>
              </li>
            )}
          </ul>
        </div>

        {/* Recent Students */}
        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <UserPlus className="h-5 w-5 mr-2 text-primary" />
              Recent Students
            </h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {stats.recent_students && stats.recent_students.length > 0 ? (
              stats.recent_students.map((student) => (
                <li
                  key={student.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="shrink-0">
                      <div className="h-10 w-10 rounded-full bg-linear-to-br from-primary/80 to-primary flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {getInitials(student.first_name, student.last_name)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {student.first_name} {student.last_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {student.email}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatRelativeTime(student.date_joined)}
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-6 py-8 text-center text-gray-500">
                <p className="text-sm">No recent students</p>
              </li>
            )}
          </ul>
        </div>

        {/* Recent Results */}
        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-green-500" />
              Recent Results
            </h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {stats.recent_results && stats.recent_results.length > 0 ? (
              stats.recent_results.map((result) => (
                <li
                  key={result.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {result.student_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {result.exam_title || 'Mock Exam'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-base font-bold ${getBandScoreColor(
                          result.overall_band_score
                        )}`}
                      >
                        {result.overall_band_score}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatRelativeTime(result.completed_at)}
                      </p>
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-6 py-8 text-center text-gray-500">
                <p className="text-sm">No recent results</p>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
