'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  Users, 
  ClipboardCheck, 
  TrendingUp, 
  PlusCircle,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { teacherDashboardApi } from '@/lib/teacher-api';
import type { DashboardStats } from '@/types/teacher';

export default function TeacherDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await teacherDashboardApi.getStats();
      setStats(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={loadDashboardStats}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-black/10">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          </div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Teacher Dashboard</h1>
              <p className="text-blue-100 text-lg">
                Manage your exams and track student performance
              </p>
            </div>
            <Link
              href="/teacher/exams/create"
              className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all shadow-lg"
            >
              <PlusCircle className="h-5 w-5" />
              Create New Exam
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Exams"
            value={stats?.total_exams || 0}
            icon={<BookOpen className="h-8 w-8 text-blue-600" />}
            subtitle={`${stats?.active_exams || 0} active`}
            color="blue"
          />
          <StatCard
            title="Total Students"
            value={stats?.total_students || 0}
            icon={<Users className="h-8 w-8 text-green-600" />}
            subtitle="Enrolled students"
            color="green"
          />
          <StatCard
            title="Pending Grading"
            value={stats?.pending_grading || 0}
            icon={<ClipboardCheck className="h-8 w-8 text-orange-600" />}
            subtitle="Needs attention"
            color="orange"
            link="/teacher/grading"
          />
          <StatCard
            title="Average Score"
            value={
              stats?.average_score !== undefined && stats?.average_score !== null
                ? Number(stats.average_score).toFixed(1)
                : '0.0'
            }
            icon={<TrendingUp className="h-8 w-8 text-purple-600" />}
            subtitle="Overall performance"
            color="purple"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activities */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Recent Activities
                </h2>
              </div>
              <div className="p-6">
                {stats?.recent_activities && stats.recent_activities.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recent_activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="shrink-0">
                            {activity.status === 'GRADED' ? (
                              <CheckCircle className="h-8 w-8 text-green-500" />
                            ) : activity.status === 'COMPLETED' ? (
                              <Clock className="h-8 w-8 text-orange-500" />
                            ) : (
                              <AlertCircle className="h-8 w-8 text-blue-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {activity.student}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {activity.exam}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {activity.score !== null && activity.score !== undefined ? (
                            <p className="text-lg font-bold text-blue-600">
                              {activity.score.toFixed(1)}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {activity.status}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(activity.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No recent activities
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h2>
              <div className="space-y-3">
                <Link
                  href="/teacher/exams"
                  className="block p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    View All Exams
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Manage your exams
                  </p>
                </Link>
                <Link
                  href="/teacher/grading"
                  className="block p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                >
                  <p className="font-medium text-orange-900 dark:text-orange-100">
                    Grade Attempts
                  </p>
                  <p className="text-sm text-orange-600 dark:text-orange-400">
                    {stats?.pending_grading || 0} pending
                  </p>
                </Link>
                <Link
                  href="/teacher/students"
                  className="block p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                >
                  <p className="font-medium text-green-900 dark:text-green-100">
                    View Students
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Student management
                  </p>
                </Link>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Summary
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Total Attempts</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {stats?.total_attempts || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Completed</span>
                  <span className="font-semibold text-green-600">
                    {stats?.completed_attempts || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Completion Rate</span>
                  <span className="font-semibold text-blue-600">
                    {stats?.total_attempts && stats.total_attempts > 0
                      ? ((stats.completed_attempts / stats.total_attempts) * 100).toFixed(1)
                      : '0'}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  subtitle: string;
  color: 'blue' | 'green' | 'orange' | 'purple';
  link?: string;
}

function StatCard({ title, value, icon, subtitle, color, link }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-200 dark:border-blue-800',
    green: 'bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10 border-green-200 dark:border-green-800',
    orange: 'bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/10 border-orange-200 dark:border-orange-800',
    purple: 'bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/10 border-purple-200 dark:border-purple-800',
  };

  const content = (
    <div className={`p-6 rounded-2xl border ${colorClasses[color]} ${link ? 'hover:shadow-xl hover:scale-105 transition-all cursor-pointer' : 'shadow-sm'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
        <div className="opacity-80">{icon}</div>
      </div>
    </div>
  );

  if (link) {
    return <Link href={link}>{content}</Link>;
  }

  return content;
}
