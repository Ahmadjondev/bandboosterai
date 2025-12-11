'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Clock,
  User,
  FileText,
  PenTool,
  Mic,
  ChevronRight,
  Sparkles,
  CheckCircle,
  Timer,
  GraduationCap,
} from 'lucide-react';
import { gradingApi, classroomApi } from '@/lib/classroom-api';
import type { GradingQueueResponse, GradingStats, ClassroomList } from '@/types/classroom';

type ContentTypeFilter = 'ALL' | 'WRITING_TASK' | 'SPEAKING_TOPIC' | 'MOCK_EXAM';

export default function GradingQueuePage() {
  const [queue, setQueue] = useState<GradingQueueResponse | null>(null);
  const [stats, setStats] = useState<GradingStats | null>(null);
  const [classrooms, setClassrooms] = useState<ClassroomList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedClassroom, setSelectedClassroom] = useState<number | null>(null);
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadQueue();
  }, [selectedClassroom]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [queueData, statsData, classroomsData] = await Promise.all([
        gradingApi.queue(),
        gradingApi.stats(),
        classroomApi.list(),
      ]);

      setQueue(queueData);
      setStats(statsData);
      setClassrooms(classroomsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load grading queue');
    } finally {
      setLoading(false);
    }
  };

  const loadQueue = async () => {
    try {
      const queueData = await gradingApi.queue(selectedClassroom || undefined);
      setQueue(queueData);
    } catch (err: any) {
      console.error('Failed to refresh queue:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadQueue();
    setRefreshing(false);
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'WRITING_TASK':
        return PenTool;
      case 'SPEAKING_TOPIC':
        return Mic;
      case 'MOCK_EXAM':
        return FileText;
      default:
        return FileText;
    }
  };

  const getTimeSinceSubmission = (submittedAt: string) => {
    const diff = Date.now() - new Date(submittedAt).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) {
      const mins = Math.floor(diff / (1000 * 60));
      return `${mins}m ago`;
    }
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const filteredItems = queue?.pending_items?.filter((item) => {
    // Content type filter
    if (contentTypeFilter !== 'ALL' && item.content_type !== contentTypeFilter) {
      return false;
    }
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.student_name.toLowerCase().includes(query) ||
        item.content_title?.toLowerCase().includes(query) ||
        item.classroom_name?.toLowerCase().includes(query)
      );
    }
    return true;
  }) || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 dark:border-blue-800 mx-auto" />
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute inset-0 mx-auto" />
          </div>
          <p className="mt-6 text-gray-600 dark:text-gray-400 font-medium">Loading grading queue...</p>
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
            Error Loading Queue
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadInitialData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-blue-600" />
            Grading Queue
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Review and grade student submissions across all classrooms
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.pending_count}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.graded_today}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Graded Today</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.ai_pending}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">AI Processing</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Timer className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.avg_grading_time || '-'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Time (min)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student name, content, or classroom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>

          {/* Classroom Filter */}
          <div className="relative">
            <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={selectedClassroom || ''}
              onChange={(e) => setSelectedClassroom(e.target.value ? Number(e.target.value) : null)}
              className="pl-10 pr-8 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white appearance-none cursor-pointer min-w-[200px]"
            >
              <option value="">All Classrooms</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Content Type Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={contentTypeFilter}
              onChange={(e) => setContentTypeFilter(e.target.value as ContentTypeFilter)}
              className="pl-10 pr-8 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white appearance-none cursor-pointer min-w-[160px]"
            >
              <option value="ALL">All Types</option>
              <option value="WRITING_TASK">Writing Tasks</option>
              <option value="SPEAKING_TOPIC">Speaking Topics</option>
              <option value="MOCK_EXAM">Mock Exams</option>
            </select>
          </div>
        </div>
      </div>

      {/* Queue List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            All Caught Up!
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery || contentTypeFilter !== 'ALL'
              ? 'No submissions match your filters.'
              : 'No submissions pending review.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const Icon = getContentIcon(item.content_type);
            return (
              <Link
                key={item.id}
                href={`/teacher/classroom/grading/${item.id}`}
                className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
              >
                <div className="flex items-center gap-4">
                  {/* Content Icon */}
                  <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                    <Icon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {item.content_title || 'Untitled'}
                      </p>
                      {item.has_ai_feedback && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs rounded-full shrink-0">
                          <Sparkles className="h-3 w-3" />
                          AI Ready
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {item.student_name}
                      </span>
                      {item.classroom_name && (
                        <span className="inline-flex items-center gap-1">
                          <GraduationCap className="h-4 w-4" />
                          {item.classroom_name}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {getTimeSinceSubmission(item.submitted_at)}
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
