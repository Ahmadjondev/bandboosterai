'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { managerAPI } from '@/lib/manager';
import type { MockTest, MockTestsFilters, ExamType } from '@/types/manager/mock-tests';
import { LoadingSpinner, Alert, StatsCard, Badge, Modal, Pagination } from '@/components/manager/shared';

export default function MockTestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState<MockTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MockTestsFilters>({
    status: '',
    exam_type: '',
    search: '',
    page: 1,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 1,
    current: 1,
    per_page: 12,
  });
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    full_tests: 0,
  });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; test: MockTest | null }>({
    open: false,
    test: null,
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadTests();
  }, [filters]);

  const loadTests = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await managerAPI.getMockTests(filters);
      setTests(response.tests);
      setPagination(response.pagination);

      // Calculate stats from response
      const totalTests = response.pagination.total;
      const activeCount = response.tests.filter((t) => t.is_active).length;
      const inactiveCount = response.tests.filter((t) => !t.is_active).length;
      const fullTestCount = response.tests.filter((t) => t.exam_type === 'FULL_TEST').length;

      setStats({
        total: totalTests,
        active: activeCount,
        inactive: inactiveCount,
        full_tests: fullTestCount,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load mock tests');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof MockTestsFilters, value: string | number) => {
    setFilters((prev) => ({ 
      ...prev, 
      [key]: value, 
      page: key !== 'page' ? 1 : (typeof value === 'number' ? value : parseInt(value as string, 10))
    }));
  };

  const handleToggleStatus = async (test: MockTest) => {
    try {
      await managerAPI.toggleMockTestStatus(test.id);
      loadTests();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle test status');
    }
  };

  const openDeleteModal = (test: MockTest) => {
    setDeleteModal({ open: true, test });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ open: false, test: null });
  };

  const handleDelete = async () => {
    if (!deleteModal.test) return;

    setDeleting(true);
    try {
      await managerAPI.deleteMockTest(deleteModal.test.id);
      closeDeleteModal();
      loadTests();
    } catch (err: any) {
      alert(err.message || 'Failed to delete test');
    } finally {
      setDeleting(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'INTERMEDIATE':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'HARD':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mock Tests</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Manage IELTS mock test templates
            </p>
          </div>
          <Link
            href="/manager/mock-tests/create"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            + Create Test
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard title="Total Tests" value={stats.total} variant="primary" />
          <StatsCard title="Active" value={stats.active} variant="success" />
          <StatsCard title="Inactive" value={stats.inactive} variant="default" />
          <StatsCard title="Full Tests" value={stats.full_tests} variant="primary" />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Search
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search by title..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Status
            </label>
            <select
              id="status"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Exam Type Filter */}
          <div>
            <label
              htmlFor="exam_type"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Exam Type
            </label>
            <select
              id="exam_type"
              value={filters.exam_type}
              onChange={(e) => handleFilterChange('exam_type', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Types</option>
              <option value="FULL_TEST">Full Test</option>
              <option value="LISTENING_READING">Listening + Reading</option>
              <option value="LISTENING_READING_WRITING">L + R + W</option>
              <option value="LISTENING">Listening Only</option>
              <option value="READING">Reading Only</option>
              <option value="WRITING">Writing Only</option>
              <option value="SPEAKING">Speaking Only</option>
            </select>
          </div>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Loading State */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Tests Grid */}
          {tests.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No mock tests found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by creating a new mock test.
              </p>
              <div className="mt-6">
                <Link
                  href="/manager/mock-tests/create"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  + Create Test
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tests.map((test) => (
                  <div
                    key={test.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                  >
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                          {test.title}
                        </h3>
                        <span
                          className={`shrink-0 ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                            test.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {test.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {/* Description */}
                      {test.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                          {test.description}
                        </p>
                      )}

                      {/* Metadata */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm">
                          <span className="font-medium text-gray-700 dark:text-gray-300 w-20">
                            Type:
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {test.exam_type_display}
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="font-medium text-gray-700 dark:text-gray-300 w-20">
                            Difficulty:
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${getDifficultyColor(
                              test.difficulty
                            )}`}
                          >
                            {test.difficulty_display}
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="font-medium text-gray-700 dark:text-gray-300 w-20">
                            Duration:
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {test.duration_minutes} min
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Link
                          href={`/manager/mock-tests/${test.id}`}
                          className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-center transition-colors"
                        >
                          View
                        </Link>
                        <Link
                          href={`/manager/mock-tests/${test.id}/edit`}
                          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-center transition-colors"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleToggleStatus(test)}
                          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          {test.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => openDeleteModal(test)}
                          className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="mt-8">
                  <Pagination
                    currentPage={pagination.current}
                    totalPages={pagination.pages}
                    hasNext={pagination.current < pagination.pages}
                    hasPrevious={pagination.current > 1}
                    onPageChange={(page) => handleFilterChange('page', page)}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && deleteModal.test && (
        <Modal show={deleteModal.open} onClose={closeDeleteModal} title="Delete Mock Test">
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {deleteModal.test.title}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
