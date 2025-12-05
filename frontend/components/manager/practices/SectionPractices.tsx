'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Library,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Eye,
  BookOpen,
  Headphones,
  Edit3,
  Mic,
  Clock,
  Gift,
  CheckCircle,
  XCircle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { managerAPI } from '@/lib/manager/api-client';
import type {
  SectionPracticeItem,
  SectionPracticeStats,
  SectionType,
  ChartType,
  WritingTaskType,
  PracticeDifficultyLevel,
} from '@/types/manager/section-practices';
import { SectionPracticeForm } from './SectionPracticeForm';
import { SectionPracticeDetail } from './SectionPracticeDetail';
import { LoadingSpinner } from '@/components/manager/shared';
import { cn } from '@/lib/manager/utils';

const SECTION_ICONS: Record<string, React.ElementType> = {
  reading: BookOpen,
  listening: Headphones,
  writing: Edit3,
  speaking: Mic,
};

const SECTION_COLORS: Record<string, string> = {
  reading: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  listening: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
  writing: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
  speaking: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: 'text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  MEDIUM: 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
  HARD: 'text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  EXPERT: 'text-purple-700 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
};

const CHART_TYPE_LABELS: Record<ChartType, string> = {
  LINE_GRAPH: 'Line Graph',
  BAR_CHART: 'Bar Chart',
  PIE_CHART: 'Pie Chart',
  TABLE: 'Table',
  MAP: 'Map',
  PROCESS: 'Process',
  FLOW_CHART: 'Flow Chart',
  MIXED: 'Mixed',
  OTHER: 'Other',
};

export function SectionPractices() {
  const [practices, setPractices] = useState<SectionPracticeItem[]>([]);
  const [stats, setStats] = useState<SectionPracticeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filters
  const [sectionType, setSectionType] = useState<SectionType | 'all'>('all');
  const [difficulty, setDifficulty] = useState<PracticeDifficultyLevel | 'all'>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [freeFilter, setFreeFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [taskType, setTaskType] = useState<WritingTaskType | 'all'>('all');
  const [chartType, setChartType] = useState<ChartType | 'all'>('all');
  const [search, setSearch] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  
  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingPractice, setEditingPractice] = useState<SectionPracticeItem | null>(null);
  const [viewingPractice, setViewingPractice] = useState<SectionPracticeItem | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null);

  const fetchPractices = useCallback(async () => {
    try {
      setLoading(true);
      const filters: any = {
        page,
        page_size: pageSize,
      };
      
      if (sectionType !== 'all') filters.section_type = sectionType;
      if (difficulty !== 'all') filters.difficulty = difficulty;
      if (activeFilter !== 'all') filters.is_active = activeFilter === 'active';
      if (freeFilter !== 'all') filters.is_free = freeFilter === 'free';
      if (taskType !== 'all') filters.task_type = taskType;
      if (chartType !== 'all') filters.chart_type = chartType;
      if (search) filters.search = search;
      
      const data = await managerAPI.getSectionPractices(filters);
      setPractices(data.practices);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.total_pages);
    } catch (error) {
      console.error('Error fetching practices:', error);
    } finally {
      setLoading(false);
    }
  }, [sectionType, difficulty, activeFilter, freeFilter, taskType, chartType, search, page]);

  const fetchStats = useCallback(async () => {
    try {
      const statsData = await managerAPI.getSectionPracticeStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchPractices();
  }, [fetchPractices]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [sectionType, difficulty, activeFilter, freeFilter, taskType, chartType]);

  const handleToggleStatus = async (practice: SectionPracticeItem) => {
    try {
      await managerAPI.toggleSectionPracticeStatus(practice.id);
      fetchPractices();
      fetchStats();
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to toggle practice status');
    }
  };

  const handleDelete = async (practice: SectionPracticeItem) => {
    if (practice.attempts_count > 0) {
      alert('Cannot delete a practice that has been attempted. Consider deactivating it instead.');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete "${practice.title}"?`)) {
      return;
    }

    try {
      await managerAPI.deleteSectionPractice(practice.id);
      fetchPractices();
      fetchStats();
    } catch (error) {
      console.error('Error deleting practice:', error);
      alert('Failed to delete practice');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingPractice(null);
    fetchPractices();
    fetchStats();
  };

  const SectionIcon = ({ section }: { section: string }) => {
    const Icon = SECTION_ICONS[section.toLowerCase()] || BookOpen;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Library className="w-7 h-7 text-primary" />
            Section Practices
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage practice content for all sections
          </p>
        </div>
        <button
          onClick={() => {
            setEditingPractice(null);
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Create Practice
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Library className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total_practices}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Active</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.active_practices}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Gift className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Free</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.free_practices}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Attempts</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total_attempts}</p>
              </div>
            </div>
          </div>
          {/* Section breakdown */}
          <div className="col-span-2 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">By Section</p>
            <div className="flex gap-4">
              {Object.entries(stats.by_section).map(([section, count]) => (
                <div key={section} className="flex items-center gap-1.5">
                  <SectionIcon section={section} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col gap-4">
          {/* Search and Section filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>

            {/* Section Type Filter */}
            <div className="flex gap-2 flex-wrap">
              {(['all', 'reading', 'listening', 'writing', 'speaking'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSectionType(s)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize flex items-center gap-1.5',
                    sectionType === s
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                >
                  {s !== 'all' && <SectionIcon section={s} />}
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Filters */}
          <div className="flex flex-wrap gap-3">
            {/* Difficulty */}
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">All Difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
              <option value="EXPERT">Expert</option>
            </select>

            {/* Active Filter */}
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as any)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Free/Premium Filter */}
            <select
              value={freeFilter}
              onChange={(e) => setFreeFilter(e.target.value as any)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">All Types</option>
              <option value="free">Free Only</option>
              <option value="premium">Premium Only</option>
            </select>

            {/* Writing-specific filters */}
            {sectionType === 'writing' && (
              <>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value as any)}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="all">All Tasks</option>
                  <option value="TASK_1">Task 1</option>
                  <option value="TASK_2">Task 2</option>
                </select>

                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as any)}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="all">All Chart Types</option>
                  {Object.entries(CHART_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Practices List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : practices.length === 0 ? (
          <div className="text-center py-12">
            <Library className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              No practices found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {search || sectionType !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first practice to get started'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Practice
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Section
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Difficulty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Attempts
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {practices.map((practice) => (
                    <tr key={practice.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {practice.title}
                              </span>
                              {practice.is_free && (
                                <Gift className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {practice.content?.title || 'No content'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className={cn(
                          'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium capitalize',
                          SECTION_COLORS[practice.section_type.toLowerCase()]
                        )}>
                          <SectionIcon section={practice.section_type} />
                          {practice.section_type}
                        </div>
                        {practice.content?.task_type && (
                          <span className="ml-2 text-xs text-gray-500">
                            {practice.content.task_type.replace('_', ' ')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          DIFFICULTY_COLORS[practice.difficulty]
                        )}>
                          {practice.difficulty}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                          <Clock className="w-4 h-4" />
                          {practice.duration_minutes} min
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {practice.attempts_count}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {practice.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            <XCircle className="w-3 h-3" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="relative">
                          <button
                            onClick={() => setActionMenuOpen(actionMenuOpen === practice.id ? null : practice.id)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-500" />
                          </button>
                          
                          {actionMenuOpen === practice.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setActionMenuOpen(null)}
                              />
                              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                                <button
                                  onClick={() => {
                                    setViewingPractice(practice);
                                    setActionMenuOpen(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Details
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingPractice(practice);
                                    setShowForm(true);
                                    setActionMenuOpen(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    handleToggleStatus(practice);
                                    setActionMenuOpen(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
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
                                  onClick={() => {
                                    handleDelete(practice);
                                    setActionMenuOpen(null);
                                  }}
                                  disabled={practice.attempts_count > 0}
                                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="flex items-center px-3 text-sm text-gray-600 dark:text-gray-400">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <SectionPracticeForm
          practice={editingPractice}
          onClose={() => {
            setShowForm(false);
            setEditingPractice(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Detail Modal */}
      {viewingPractice && (
        <SectionPracticeDetail
          practiceId={viewingPractice.id}
          onClose={() => setViewingPractice(null)}
          onEdit={() => {
            setEditingPractice(viewingPractice);
            setViewingPractice(null);
            setShowForm(true);
          }}
        />
      )}
    </div>
  );
}
