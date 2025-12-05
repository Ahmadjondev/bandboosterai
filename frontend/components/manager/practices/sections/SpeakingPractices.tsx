'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Upload,
  Mic,
  Target,
  Clock,
} from 'lucide-react';
import { managerAPI } from '@/lib/manager/api-client';
import { BulkAddModal } from './BulkAddModal';
import { PracticeFormModal } from './PracticeFormModal';
import { PracticeViewModal } from './PracticeViewModal';
import type { PracticeItem, PracticeFilters, PracticeStats } from '@/types/manager/practices';

const DIFFICULTY_COLORS = {
  EASY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  HARD: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  EXPERT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const DIFFICULTY_LABELS = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
  EXPERT: 'Expert',
};

export function SpeakingPractices() {
  const [practices, setPractices] = useState<PracticeItem[]>([]);
  const [stats, setStats] = useState<PracticeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PracticeFilters>({
    page: 1,
    page_size: 20,
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Modals
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [viewPractice, setViewPractice] = useState<PracticeItem | null>(null);
  const [editPractice, setEditPractice] = useState<PracticeItem | null>(null);
  
  // Action menu
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  const fetchPractices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await managerAPI.getSpeakingPractices(filters);
      // Backend returns { practices: [...], pagination: {...} }
      const practices = response.practices || response.results || [];
      const pagination = response.pagination || {};
      setPractices(practices);
      setTotalPages(pagination.total_pages || Math.ceil((pagination.total || 0) / (filters.page_size || 20)));
      setTotalCount(pagination.total || response.count || 0);
      if (response.stats) {
        setStats(response.stats);
      } else {
        // Calculate basic stats from data
        setStats({
          total: pagination.total || practices.length,
          active: practices.filter((p: any) => p.is_active).length,
          free: practices.filter((p: any) => p.is_free).length,
          total_attempts: practices.reduce((sum: number, p: any) => sum + (p.attempts_count || 0), 0),
        });
      }
    } catch (err) {
      console.error('Error fetching speaking practices:', err);
      setError('Failed to load speaking practices');
      setPractices([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPractices();
  }, [fetchPractices]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this practice?')) return;
    
    try {
      setDeleting(id);
      await managerAPI.deleteSpeakingPractice(id);
      fetchPractices();
    } catch (err) {
      console.error('Error deleting practice:', err);
      alert('Failed to delete practice');
    } finally {
      setDeleting(null);
      setActionMenuId(null);
    }
  };

  const handleToggleStatus = async (practice: PracticeItem) => {
    try {
      setToggling(practice.id);
      await managerAPI.toggleSpeakingPracticeStatus(practice.id);
      fetchPractices();
    } catch (err) {
      console.error('Error toggling status:', err);
      alert('Failed to toggle status');
    } finally {
      setToggling(null);
      setActionMenuId(null);
    }
  };

  const updateFilter = (key: keyof PracticeFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Speaking Practices
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage speaking topic practices
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/manager/practices/speaking/bulk-add"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Bulk Add
          </Link>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Practice
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Mic className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Practices</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Free</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.free}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Target className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Attempts</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total_attempts}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Filters:</span>
        </div>
        
        <select
          value={filters.difficulty || ''}
          onChange={(e) => updateFilter('difficulty', e.target.value || undefined)}
          className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
          <option value="EXPERT">Expert</option>
        </select>
        
        <select
          value={filters.is_active === undefined ? '' : filters.is_active.toString()}
          onChange={(e) => updateFilter('is_active', e.target.value === '' ? undefined : e.target.value === 'true')}
          className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        
        <select
          value={filters.is_free === undefined ? '' : filters.is_free.toString()}
          onChange={(e) => updateFilter('is_free', e.target.value === '' ? undefined : e.target.value === 'true')}
          className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Access</option>
          <option value="true">Free</option>
          <option value="false">Premium</option>
        </select>
        
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value || undefined)}
            placeholder="Search practices..."
            className="w-full pl-9 pr-4 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <button
          onClick={fetchPractices}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading && (!practices || practices.length === 0) ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchPractices}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : !practices || practices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Mic className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">No speaking practices found</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create First Practice
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Practice
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Topic
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Difficulty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Access
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Attempts
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {practices.map((practice) => (
                    <tr key={practice.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                          {practice.title}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {practice.content && (
                          <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[150px] inline-block">
                            {practice.content.title}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          DIFFICULTY_COLORS[practice.difficulty as keyof typeof DIFFICULTY_COLORS]
                        }`}>
                          {DIFFICULTY_LABELS[practice.difficulty as keyof typeof DIFFICULTY_LABELS]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {practice.duration_minutes || 'Auto'} min
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          practice.is_active
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {practice.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          practice.is_free
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        }`}>
                          {practice.is_free ? 'Free' : 'Premium'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {practice.total_attempts || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          <div className="relative">
                            <button
                              onClick={() => setActionMenuId(actionMenuId === practice.id ? null : practice.id)}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-500" />
                            </button>
                            {actionMenuId === practice.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setActionMenuId(null)}
                                />
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                                  <button
                                    onClick={() => {
                                      setViewPractice(practice);
                                      setActionMenuId(null);
                                    }}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View Details
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditPractice(practice);
                                      setActionMenuId(null);
                                    }}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleToggleStatus(practice)}
                                    disabled={toggling === practice.id}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    {toggling === practice.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : practice.is_active ? (
                                      <ToggleLeft className="w-4 h-4" />
                                    ) : (
                                      <ToggleRight className="w-4 h-4" />
                                    )}
                                    {practice.is_active ? 'Deactivate' : 'Activate'}
                                  </button>
                                  <hr className="my-1 border-gray-200 dark:border-gray-700" />
                                  <button
                                    onClick={() => handleDelete(practice.id)}
                                    disabled={deleting === practice.id}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    {deleting === practice.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {practices.length} of {totalCount} practices
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateFilter('page', filters.page! - 1)}
                  disabled={filters.page === 1}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Page {filters.page} of {totalPages}
                </span>
                <button
                  onClick={() => updateFilter('page', filters.page! + 1)}
                  disabled={filters.page === totalPages}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {showBulkAdd && (
        <BulkAddModal
          sectionType="speaking"
          onClose={() => setShowBulkAdd(false)}
          onSuccess={() => {
            setShowBulkAdd(false);
            fetchPractices();
          }}
        />
      )}

      {showCreate && (
        <PracticeFormModal
          sectionType="speaking"
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            fetchPractices();
          }}
        />
      )}

      {viewPractice && (
        <PracticeViewModal
          practice={viewPractice}
          sectionType="speaking"
          onClose={() => setViewPractice(null)}
          onEdit={() => {
            setEditPractice(viewPractice);
            setViewPractice(null);
          }}
        />
      )}

      {editPractice && (
        <PracticeFormModal
          sectionType="speaking"
          practice={editPractice}
          onClose={() => setEditPractice(null)}
          onSuccess={() => {
            setEditPractice(null);
            fetchPractices();
          }}
        />
      )}
    </div>
  );
}
