'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Headphones,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Package,
  CheckCircle,
  XCircle,
  Crown,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { managerAPI } from '@/lib/manager/api-client';
import { LoadingSpinner } from '@/components/manager/shared';
import { cn } from '@/lib/manager/utils';
import { BulkAddModal } from './BulkAddModal';
import { PracticeFormModal } from './PracticeFormModal';
import { PracticeViewModal } from './PracticeViewModal';

interface ListeningPracticesProps {}

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  HARD: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  EXPERT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function ListeningPractices({}: ListeningPracticesProps) {
  const [practices, setPractices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [difficulty, setDifficulty] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [freeFilter, setFreeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedPractice, setSelectedPractice] = useState<any>(null);
  const [actionMenu, setActionMenu] = useState<number | null>(null);

  const fetchPractices = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = { page, page_size: 20 };
      if (difficulty !== 'all') filters.difficulty = difficulty;
      if (activeFilter !== 'all') filters.is_active = activeFilter === 'active';
      if (freeFilter !== 'all') filters.is_free = freeFilter === 'free';
      if (search) filters.search = search;

      const response = await managerAPI.getListeningPractices(filters);
      setPractices(response.practices || []);
      setTotalPages(response.pagination?.total_pages || 1);
      setTotalCount(response.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching practices:', error);
    } finally {
      setLoading(false);
    }
  }, [page, difficulty, activeFilter, freeFilter, search]);

  useEffect(() => {
    fetchPractices();
  }, [fetchPractices]);

  const handleToggleStatus = async (practiceId: number) => {
    try {
      await managerAPI.toggleListeningPracticeStatus(practiceId);
      fetchPractices();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
    setActionMenu(null);
  };

  const handleDelete = async (practiceId: number) => {
    if (!confirm('Are you sure you want to delete this practice?')) return;
    try {
      await managerAPI.deleteListeningPractice(practiceId);
      fetchPractices();
    } catch (error) {
      console.error('Error deleting practice:', error);
    }
    setActionMenu(null);
  };

  const handleEdit = (practice: any) => {
    setSelectedPractice(practice);
    setShowForm(true);
    setActionMenu(null);
  };

  const handleView = (practice: any) => {
    setSelectedPractice(practice);
    setShowDetail(true);
    setActionMenu(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Headphones className="w-7 h-7 text-blue-600" />
            Listening Practices
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage listening section practices ({totalCount} total)
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/manager/practices/listening/bulk-add"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <Package className="w-4 h-4" />
            Bulk Add
          </Link>
          <button
            onClick={() => {
              setSelectedPractice(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Practice
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search practices..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Difficulty */}
          <select
            value={difficulty}
            onChange={(e) => {
              setDifficulty(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
            <option value="EXPERT">Expert</option>
          </select>

          {/* Status */}
          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Free/Premium */}
          <select
            value={freeFilter}
            onChange={(e) => {
              setFreeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Access</option>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
          </select>

          {/* Refresh */}
          <button
            onClick={fetchPractices}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : practices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
            <Headphones className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No listening practices found</p>
            <p className="text-sm">Create your first practice or adjust filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Practice
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Content
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Difficulty
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Questions
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Access
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Attempts
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {practices.map((practice) => (
                  <tr
                    key={practice.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <Headphones className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {practice.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {practice.duration_minutes} min
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900 dark:text-white">
                        {practice.content?.title || 'No content'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Part {practice.content?.part_number || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          'px-2 py-1 text-xs font-medium rounded-full',
                          DIFFICULTY_COLORS[practice.difficulty] || 'bg-gray-100 text-gray-800'
                        )}
                      >
                        {practice.difficulty_display || practice.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <HelpCircle className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">
                          {practice.total_questions}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {practice.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">
                          <XCircle className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {practice.is_free ? (
                        <span className="text-green-600 dark:text-green-400 text-sm">Free</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-sm">
                          <Crown className="w-3 h-3" />
                          Premium
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center text-gray-900 dark:text-white">
                      {practice.attempts_count || 0}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="relative">
                        <button
                          onClick={() => setActionMenu(actionMenu === practice.id ? null : practice.id)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                        {actionMenu === practice.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                            <button
                              onClick={() => handleView(practice)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Eye className="w-4 h-4" />
                              View Details
                            </button>
                            <button
                              onClick={() => handleEdit(practice)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleStatus(practice.id)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              {practice.is_active ? (
                                <>
                                  <ToggleLeft className="w-4 h-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <ToggleRight className="w-4 h-4" />
                                  Activate
                                </>
                              )}
                            </button>
                            <hr className="my-1 border-gray-200 dark:border-gray-700" />
                            <button
                              onClick={() => handleDelete(practice.id)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showBulkAdd && (
        <BulkAddModal
          sectionType="listening"
          onClose={() => setShowBulkAdd(false)}
          onSuccess={() => {
            setShowBulkAdd(false);
            fetchPractices();
          }}
        />
      )}

      {showForm && (
        <PracticeFormModal
          sectionType="listening"
          practice={selectedPractice}
          onClose={() => {
            setShowForm(false);
            setSelectedPractice(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setSelectedPractice(null);
            fetchPractices();
          }}
        />
      )}

      {showDetail && selectedPractice && (
        <PracticeViewModal
          sectionType="listening"
          practice={selectedPractice}
          onClose={() => {
            setShowDetail(false);
            setSelectedPractice(null);
          }}
          onEdit={() => {
            setShowDetail(false);
            setShowForm(true);
          }}
        />
      )}
    </div>
  );
}