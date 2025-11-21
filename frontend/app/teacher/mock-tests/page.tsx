'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, PlusCircle, Search, Filter, Eye, Edit, Trash2, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { teacherMockExamApi } from '@/lib/teacher-api';
import type { MockExamBasic } from '@/types/teacher';

export default function TeacherMockTestsPage() {
  const [mockTests, setMockTests] = useState<MockExamBasic[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    exam_type: '',
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [testsData, statsData] = await Promise.all([
        teacherMockExamApi.getMockExams(filters),
        teacherMockExamApi.getStats()
      ]);
      setMockTests(testsData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load mock tests');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this mock test?')) return;
    
    try {
      await teacherMockExamApi.deleteMockExam(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete mock test');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <BookOpen className="h-7 w-7" />
                Mock Tests
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Create and manage IELTS mock tests for your students
              </p>
            </div>
            <Link
              href="/teacher/mock-tests/create"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <PlusCircle className="h-5 w-5" />
              Create Mock Test
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Info Banner */}
        <div className="mb-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
          <p className="text-sm text-yellow-900 dark:text-yellow-100">
            Mock tests you create will be inactive until reviewed by an admin
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending Review</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.inactive}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search by title..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Exam Type
              </label>
              <select
                value={filters.exam_type}
                onChange={(e) => setFilters({ ...filters, exam_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="">All Types</option>
                <option value="LISTENING">Listening</option>
                <option value="READING">Reading</option>
                <option value="WRITING">Writing</option>
                <option value="SPEAKING">Speaking</option>
                <option value="LISTENING_READING">Listening + Reading</option>
                <option value="LISTENING_READING_WRITING">Listening + Reading + Writing</option>
                <option value="FULL_TEST">Full Test</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mock Tests Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : mockTests.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No mock tests found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create your first mock test to get started
            </p>
            <Link
              href="/teacher/mock-tests/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <PlusCircle className="h-5 w-5" />
              Create Mock Test
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockTests.map((test) => (
              <div
                key={test.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
              >
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {test.title}
                  </h3>
                  {test.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {test.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-3 text-sm">
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded text-xs font-medium">
                    {test.exam_type_display}
                  </span>
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Clock className="h-4 w-4" />
                    <span>{test.duration_minutes} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {test.is_active ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-green-600 text-xs font-medium">Active</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 text-orange-600" />
                        <span className="text-orange-600 text-xs font-medium">Pending</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <Link
                    href={`/teacher/mock-tests/${test.id}`}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Link>
                  {!test.is_active ? (
                    <>
                      <Link
                        href={`/teacher/mock-tests/${test.id}/edit`}
                        className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(test.id)}
                        className="flex items-center justify-center gap-2 px-3 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <div className="flex-1 text-center text-xs text-gray-500 dark:text-gray-400 italic">
                      Contact admin to modify
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
