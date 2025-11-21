'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, 
  PlusCircle, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  Trash2,
  Edit,
  Eye
} from 'lucide-react';
import { teacherMockExamApi } from '@/lib/teacher-api';
import type { MockExamBasic } from '@/types/teacher';

export default function TeacherMockExamsPage() {
  const router = useRouter();
  const [mockExams, setMockExams] = useState<MockExamBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    exam_type: '',
    search: '',
  });
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [examsData, statsData] = await Promise.all([
        teacherMockExamApi.getMockExams(filters),
        teacherMockExamApi.getStats()
      ]);
      setMockExams(examsData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load mock exams');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this mock exam?')) return;
    
    try {
      await teacherMockExamApi.deleteMockExam(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete mock exam');
    }
  };

  const examTypes = [
    { value: '', label: 'All Types' },
    { value: 'LISTENING', label: 'Listening' },
    { value: 'READING', label: 'Reading' },
    { value: 'WRITING', label: 'Writing' },
    { value: 'SPEAKING', label: 'Speaking' },
    { value: 'LISTENING_READING', label: 'Listening + Reading' },
    { value: 'LISTENING_READING_WRITING', label: 'Listening + Reading + Writing' },
    { value: 'FULL_TEST', label: 'Full Test' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-black/10">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          </div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Mock Exams</h1>
              </div>
              <p className="text-blue-100 text-lg">
                Create and manage IELTS mock exams for your students
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm bg-yellow-500/20 border border-yellow-500/30 rounded-lg px-4 py-2 w-fit">
                <AlertTriangle className="h-4 w-4" />
                <span>Mock exams you create will be inactive until reviewed by an admin</span>
              </div>
            </div>
            <Link
              href="/teacher/mock-exams/create"
              className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all shadow-lg"
            >
              <PlusCircle className="h-5 w-5" />
              Create Mock Exam
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 border-2 border-blue-200 dark:border-blue-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Mock Exams</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <BookOpen className="h-12 w-12 text-blue-600 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10 border-2 border-green-200 dark:border-green-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Exams</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
              </div>
              <CheckCircle2 className="h-12 w-12 text-green-600 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/10 border-2 border-orange-200 dark:border-orange-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Review</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.inactive}</p>
              </div>
              <Clock className="h-12 w-12 text-orange-600 opacity-80" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Pending Review</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={filters.exam_type}
                onChange={(e) => setFilters({ ...filters, exam_type: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {examTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading mock exams...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-6 w-6 text-red-600" />
              <div>
                <p className="font-semibold text-red-900 dark:text-red-100">Error</p>
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Mock Exams Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockExams.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-lg">No mock exams found</p>
                <Link
                  href="/teacher/mock-exams/create"
                  className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <PlusCircle className="h-5 w-5" />
                  Create Your First Mock Exam
                </Link>
              </div>
            ) : (
              mockExams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-xl"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                          {exam.title}
                        </h3>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                          {exam.exam_type_display}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {exam.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                        {exam.description}
                      </p>
                    )}

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 mb-4 text-sm">
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <Clock className="h-4 w-4" />
                        <span>{exam.duration_minutes} min</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {exam.is_active ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-green-600 font-medium">Active</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-4 w-4 text-orange-600" />
                            <span className="text-orange-600 font-medium">Pending</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Difficulty Badge */}
                    <div className="mb-4">
                      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
                        {exam.difficulty_level}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Link
                        href={`/teacher/mock-exams/${exam.id}`}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                      {!exam.is_active ? (
                        <>
                          <Link
                            href={`/teacher/mock-exams/${exam.id}/edit`}
                            className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(exam.id)}
                            className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <div className="flex-1 text-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                            Active - Contact admin to modify
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
