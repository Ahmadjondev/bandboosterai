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
  Clock,
  ChevronRight,
  BarChart3,
  Target,
  Award,
  UserCheck,
  Filter,
  RefreshCw,
  Sparkles,
  GraduationCap,
  FileText,
} from 'lucide-react';
import { teacherDashboardApi } from '@/lib/teacher-api';
import type { DashboardStats, StudentAnalytics, PerformanceOverview, ExamAnalytics } from '@/types/teacher';
import {
  ScoreDistributionChart,
  SectionRadarChart,
  PerformanceTrendChart,
  StudentAnalyticsList,
} from '@/components/teacher/analytics';

type TabType = 'overview' | 'students' | 'exams';

export default function TeacherDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [students, setStudents] = useState<StudentAnalytics[]>([]);
  const [performance, setPerformance] = useState<PerformanceOverview | null>(null);
  const [examStats, setExamStats] = useState<ExamAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all data in parallel
      const [statsData, studentsData, performanceData, examsData] = await Promise.all([
        teacherDashboardApi.getStats(),
        teacherDashboardApi.getStudentsAnalytics(),
        teacherDashboardApi.getPerformanceOverview(),
        teacherDashboardApi.getExamAnalytics(),
      ]);
      
      setStats(statsData);
      setStudents(studentsData);
      setPerformance(performanceData);
      setExamStats(examsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 dark:border-blue-800 mx-auto"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute inset-0 mx-auto"></div>
          </div>
          <p className="mt-6 text-gray-600 dark:text-gray-400 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={loadAllData}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'exams', label: 'Exams', icon: FileText },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white overflow-hidden relative">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold">Teacher Dashboard</h1>
              </div>
              <p className="text-blue-100 text-lg">
                Track student progress and manage your exams
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <Link
                href="/teacher/exams/create"
                className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all shadow-lg"
              >
                <PlusCircle className="h-5 w-5" />
                Create Exam
              </Link>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <QuickStatCard
              icon={<BookOpen className="h-5 w-5" />}
              label="Total Exams"
              value={stats?.total_exams || 0}
              subValue={`${stats?.active_exams || 0} active`}
            />
            <QuickStatCard
              icon={<Users className="h-5 w-5" />}
              label="Students"
              value={stats?.total_students || 0}
              subValue="enrolled"
            />
            <QuickStatCard
              icon={<ClipboardCheck className="h-5 w-5" />}
              label="Pending"
              value={stats?.pending_grading || 0}
              subValue="to grade"
              highlight={Boolean(stats?.pending_grading && stats.pending_grading > 0)}
            />
            <QuickStatCard
              icon={<Target className="h-5 w-5" />}
              label="Avg Score"
              value={stats?.average_score ? Number(stats.average_score).toFixed(1) : '0.0'}
              subValue="band score"
            />
          </div>
        </div>
      </div>

      {/* Tab Navigation - Overlapping Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-2">
          <div className="flex gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <OverviewTab
            stats={stats}
            performance={performance}
            students={students}
          />
        )}
        {activeTab === 'students' && (
          <StudentsTab students={students} />
        )}
        {activeTab === 'exams' && (
          <ExamsTab examStats={examStats} />
        )}
      </div>
    </div>
  );
}

// Quick Stat Card for Hero
interface QuickStatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subValue: string;
  highlight?: boolean;
}

function QuickStatCard({ icon, label, value, subValue, highlight }: QuickStatCardProps) {
  return (
    <div className={`p-4 rounded-xl backdrop-blur-sm ${
      highlight 
        ? 'bg-orange-500/20 border border-orange-400/30' 
        : 'bg-white/10'
    }`}>
      <div className="flex items-center gap-2 mb-2 opacity-80">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl md:text-3xl font-bold">{value}</div>
      <div className="text-xs opacity-70">{subValue}</div>
    </div>
  );
}

// Overview Tab Content
interface OverviewTabProps {
  stats: DashboardStats | null;
  performance: PerformanceOverview | null;
  students: StudentAnalytics[];
}

function OverviewTab({ stats, performance, students }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Score Distribution
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {performance?.total_graded || 0} tests
            </span>
          </div>
          {performance?.score_distribution ? (
            <ScoreDistributionChart distribution={performance.score_distribution} />
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No score data available
            </div>
          )}
        </div>

        {/* Section Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              Section Performance
            </h2>
          </div>
          {performance?.section_averages ? (
            <SectionRadarChart
              averages={performance.section_averages}
              strongestSection={performance.strongest_section}
              weakestSection={performance.weakest_section}
            />
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No section data available
            </div>
          )}
        </div>
      </div>

      {/* Performance Trend */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Performance Trend
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">Last 6 months</span>
        </div>
        <PerformanceTrendChart trends={performance?.performance_trends || []} />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Top Performers
            </h2>
          </div>
          {performance?.top_performers && performance.top_performers.length > 0 ? (
            <div className="space-y-3">
              {performance.top_performers.map((performer, index) => (
                <div
                  key={performer.student.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                    index === 1 ? 'bg-gray-200 text-gray-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {performer.student.full_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {performer.attempts_count} test{performer.attempts_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-emerald-600">
                    {Number(performer.average_score).toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              No data available
            </div>
          )}
        </div>

        {/* Students Needing Attention */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Need Attention
            </h2>
          </div>
          {performance?.students_needing_attention && performance.students_needing_attention.length > 0 ? (
            <div className="space-y-3">
              {performance.students_needing_attention.map((student) => (
                <div
                  key={student.student.id}
                  className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30"
                >
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <span className="font-semibold text-red-700 dark:text-red-400">
                      {student.student.full_name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {student.student.full_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {student.attempts_count} test{student.attempts_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-red-600">
                    {Number(student.average_score).toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>All students are performing well!</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Recent Activities
          </h2>
          <Link
            href="/teacher/grading"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            View all
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {stats?.recent_activities && stats.recent_activities.length > 0 ? (
          <div className="space-y-3">
            {stats.recent_activities.slice(0, 5).map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activity.status === 'GRADED' 
                      ? 'bg-green-100 dark:bg-green-900/30' 
                      : activity.status === 'COMPLETED'
                      ? 'bg-orange-100 dark:bg-orange-900/30'
                      : 'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    {activity.status === 'GRADED' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : activity.status === 'COMPLETED' ? (
                      <Clock className="h-5 w-5 text-orange-600" />
                    ) : (
                      <Sparkles className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {activity.student}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {activity.exam}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {activity.score !== null && activity.score !== undefined ? (
                    <div className="text-lg font-bold text-blue-600">
                      {Number(activity.score).toFixed(1)}
                    </div>
                  ) : (
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      activity.status === 'COMPLETED' 
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' 
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {activity.status}
                    </span>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(activity.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            No recent activities
          </div>
        )}
      </div>
    </div>
  );
}

// Students Tab Content
interface StudentsTabProps {
  students: StudentAnalytics[];
}

function StudentsTab({ students }: StudentsTabProps) {
  const [filter, setFilter] = useState<'all' | 'improving' | 'declining' | 'stable'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'recent'>('score');

  const filteredStudents = students
    .filter((s) => filter === 'all' || s.progress_trend === filter)
    .sort((a, b) => {
      if (sortBy === 'name') return a.full_name.localeCompare(b.full_name);
      if (sortBy === 'score') return (b.average_score || 0) - (a.average_score || 0);
      if (sortBy === 'recent') {
        const aDate = a.last_activity ? new Date(a.last_activity).getTime() : 0;
        const bDate = b.last_activity ? new Date(b.last_activity).getTime() : 0;
        return bDate - aDate;
      }
      return 0;
    });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
            <div className="flex gap-2">
              {[
                { id: 'all', label: 'All' },
                { id: 'improving', label: '📈 Improving' },
                { id: 'declining', label: '📉 Declining' },
                { id: 'stable', label: '➡️ Stable' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setFilter(opt.id as typeof filter)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filter === opt.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <option value="score">By Score</option>
              <option value="name">By Name</option>
              <option value="recent">By Recent Activity</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Students</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{students.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
            <span className="text-lg">📈</span> Improving
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {students.filter(s => s.progress_trend === 'improving').length}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
            <span className="text-lg">📉</span> Declining
          </div>
          <div className="text-2xl font-bold text-red-600">
            {students.filter(s => s.progress_trend === 'declining').length}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
            <span className="text-lg">➡️</span> Stable
          </div>
          <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
            {students.filter(s => s.progress_trend === 'stable').length}
          </div>
        </div>
      </div>

      {/* Students List */}
      <StudentAnalyticsList students={filteredStudents} />
    </div>
  );
}

// Exams Tab Content
interface ExamsTabProps {
  examStats: ExamAnalytics[];
}

function ExamsTab({ examStats }: ExamsTabProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('all');

  const filteredExams = examStats.filter(
    (exam) => statusFilter === 'all' || exam.status === statusFilter
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      case 'ARCHIVED':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
          {(['all', 'PUBLISHED', 'DRAFT', 'ARCHIVED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Exams Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Exam
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Attempts
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Avg Score
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Pass Rate
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredExams.map((exam) => (
                <tr key={exam.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{exam.title}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Created {new Date(exam.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusStyle(exam.status)}`}>
                      {exam.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {exam.total_attempts}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {exam.graded_attempts} graded
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {exam.average_score ? (
                      <div className={`text-lg font-bold ${
                        exam.average_score >= 6.5 
                          ? 'text-emerald-600' 
                          : exam.average_score >= 5.5 
                          ? 'text-yellow-600' 
                          : 'text-red-600'
                      }`}>
                        {Number(exam.average_score).toFixed(1)}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {exam.pass_rate !== null ? (
                      <div className={`text-lg font-bold ${
                        exam.pass_rate >= 70 
                          ? 'text-emerald-600' 
                          : exam.pass_rate >= 50 
                          ? 'text-yellow-600' 
                          : 'text-red-600'
                      }`}>
                        {Number(exam.pass_rate).toFixed(0)}%
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Link
                      href={`/teacher/exams/${exam.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      View
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredExams.length === 0 && (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p>No exams found</p>
          </div>
        )}
      </div>
    </div>
  );
}
