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
} from '@/lib/manager/utils';
import { LoadingSpinner, Alert, StatsCard } from '@/components/manager/shared';
import {
  TrendLineChart,
  ComparisonBarChart,
  DistributionPieChart,
} from '@/components/manager/dashboard/Charts';
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
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      loadDashboardStats();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
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

  // Transform data for charts
  const getTrendChartData = () => {
    if (!stats?.performance_trend) return [];
    
    return stats.performance_trend.map((week: PerformanceTrend) => ({
      week: week.week,
      'Average Score': week.average_score,
      'Tests Count': week.count / 10, // Scale down for better visualization
    }));
  };

  const getSectionChartData = () => {
    if (!stats?.section_performance) return [];
    
    return stats.section_performance.map((section: SectionPerformance) => ({
      section: section.section,
      'Average Score': section.average,
      'Total Tests': section.total_tests / 100, // Scale down
    }));
  };

  const getScoreDistributionData = () => {
    if (!stats?.score_distribution) return [];
    
    return Object.entries(stats.score_distribution).map(([band, count]) => ({
      name: `Band ${band}`,
      value: count as number,
    }));
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
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Real-time overview of your IELTS management system
          </p>
        </div>
        <button
          onClick={refreshDashboard}
          disabled={refreshing}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
          />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Key Metrics Grid - Using StatsCard */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="Total Students"
          value={stats.total_students}
          icon={Users}
          variant="primary"
          subtitle={`${stats.active_students} active`}
          trend={{
            value: stats.new_students_this_week > 0 
              ? Math.round((stats.new_students_this_week / stats.total_students) * 100)
              : 0,
            label: 'this week',
            isPositive: true,
          }}
        />

        <StatsCard
          title="Mock Exams"
          value={stats.total_mock_exams}
          icon={Activity}
          variant="success"
          subtitle={`${stats.active_mock_exams} active`}
          trend={{
            value: stats.upcoming_exams > 0 
              ? Math.round((stats.upcoming_exams / stats.total_mock_exams) * 100)
              : 0,
            label: 'upcoming',
            isPositive: true,
          }}
        />

        <StatsCard
          title="Completed Tests"
          value={stats.total_results}
          icon={CheckSquare}
          variant="default"
          subtitle={`${stats.results_this_month} this month`}
          trend={{
            value: stats.completion_rate,
            label: 'completion rate',
            isPositive: stats.completion_rate >= 70,
          }}
        />

        <StatsCard
          title="Average Band"
          value={stats.average_score}
          icon={Award}
          variant="warning"
          subtitle="Overall average"
          trend={{
            value: stats.engagement_rate,
            label: 'engaged',
            isPositive: stats.engagement_rate >= 80,
          }}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Performance Trend Line Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-primary" />
              Performance Trend (Last 5 Weeks)
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track average scores and test volume over time
            </p>
          </div>
          <div className="p-6">
            <TrendLineChart
              data={getTrendChartData()}
              lines={[
                { dataKey: 'Average Score', name: 'Avg Score', color: 'primary' },
                { dataKey: 'Tests Count', name: 'Tests (÷10)', color: 'secondary' },
              ]}
              xAxisKey="week"
            />
          </div>
        </div>

        {/* Score Distribution Pie Chart */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Activity className="h-5 w-5 mr-2 text-purple-500" />
              Score Distribution
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Student performance distribution
            </p>
          </div>
          <div className="p-6">
            <DistributionPieChart
              data={getScoreDistributionData()}
              dataKey="value"
              nameKey="name"
            />
          </div>
        </div>
      </div>

      {/* Section Performance Bar Chart */}
      <div className="mb-8">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Activity className="h-5 w-5 mr-2 text-green-500" />
              Section-wise Performance
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Compare average scores across all IELTS sections
            </p>
          </div>
          <div className="p-6">
            <ComparisonBarChart
              data={getSectionChartData()}
              bars={[
                { dataKey: 'Average Score', name: 'Avg Score', color: 'success' },
                { dataKey: 'Total Tests', name: 'Tests (÷100)', color: 'warning' },
              ]}
              xAxisKey="section"
            />
          </div>
        </div>
      </div>

      {/* Content Library Grid */}
      <div className="mb-8">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <BookOpen className="h-5 w-5 mr-2 text-primary" />
              Content Library
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatsCard
                title="Reading Passages"
                value={stats.total_reading_passages}
                icon={BookOpen}
                variant="primary"
                className="p-4"
              />
              <StatsCard
                title="Listening Parts"
                value={stats.total_listening_parts}
                icon={Headphones}
                variant="success"
                className="p-4"
              />
              <StatsCard
                title="Writing Tasks"
                value={stats.total_writing_tasks}
                icon={Edit3}
                variant="default"
                className="p-4"
              />
              <StatsCard
                title="Speaking Topics"
                value={stats.total_speaking_topics}
                icon={Mic}
                variant="warning"
                className="p-4"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity & Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Performers */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-linear-to-r from-yellow-50 dark:from-yellow-900/20 to-orange-50 dark:to-orange-900/20">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
              Top Performers (30 Days)
            </h3>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {stats.top_performers && stats.top_performers.length > 0 ? (
              stats.top_performers.map((performer, index) => (
                <li
                  key={`performer-${performer.id}-${index}`}
                  className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {performer.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
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
              <li className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                <Award className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm">No results yet</p>
              </li>
            )}
          </ul>
        </div>

        {/* Recent Students */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <UserPlus className="h-5 w-5 mr-2 text-primary" />
              Recent Students
            </h3>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {stats.recent_students && stats.recent_students.length > 0 ? (
              stats.recent_students.map((student, index) => (
                <li
                  key={`student-${student.id}-${index}`}
                  className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
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
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {student.first_name} {student.last_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
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
              <li className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                <p className="text-sm">No recent students</p>
              </li>
            )}
          </ul>
        </div>

        {/* Recent Results */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Activity className="h-5 w-5 mr-2 text-green-500" />
              Recent Results
            </h3>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {stats.recent_results && stats.recent_results.length > 0 ? (
              stats.recent_results.map((result, index) => (
                <li
                  key={`result-${result.id}-${index}`}
                  className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {result.student_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
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
              <li className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                <p className="text-sm">No recent results</p>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
