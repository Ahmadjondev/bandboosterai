'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  ChevronLeft,
  ChevronRight,
  Clock,
  Trophy,
  Target,
  Filter,
  Play,
  CheckCircle,
  Search,
  X,
  LayoutGrid,
  List,
  Crown,
  Sparkles,
} from 'lucide-react';
import {
  getSectionPracticesByType,
  getDifficultyColor,
} from '@/lib/api/section-practice';
import type {
  SectionPractice,
  SectionPracticesByTypeResponse,
  SectionType,
  Difficulty,
  StatusFilter,
  PaginationInfo,
  WritingTaskType,
  ChartType,
  AvailableFilters,
} from '@/types/section-practice';

type PremiumFilter = 'all' | 'free' | 'premium';

const sectionIcons = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenTool,
  speaking: Mic,
};

const sectionDescriptions = {
  listening: 'Practice your listening skills with audio-based exercises. Improve comprehension and note-taking abilities.',
  reading: 'Enhance your reading comprehension with passages and various question types. Build vocabulary and speed.',
  writing: 'Develop your writing skills with Task 1 and Task 2 practice. Get feedback on structure and coherence.',
  speaking: 'Practice speaking topics with recording capabilities. Improve fluency and pronunciation.',
};

const sectionColors = {
  listening: {
    gradient: 'from-blue-500 to-cyan-500',
    light: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
  },
  reading: {
    gradient: 'from-green-500 to-emerald-500',
    light: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-400',
  },
  writing: {
    gradient: 'from-purple-500 to-pink-500',
    light: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-600 dark:text-purple-400',
  },
  speaking: {
    gradient: 'from-orange-500 to-amber-500',
    light: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-600 dark:text-orange-400',
  },
};

type ViewMode = 'grid' | 'list';

const VIEW_MODE_STORAGE_KEY = 'practice-view-mode';

export default function SectionTypePage() {
  const params = useParams();
  const router = useRouter();
  const sectionType = (params.type as string)?.toLowerCase();

  const [data, setData] = useState<SectionPracticesByTypeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | ''>('');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [filterPremium, setFilterPremium] = useState<PremiumFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // Writing-specific filters
  const [filterTaskType, setFilterTaskType] = useState<WritingTaskType | ''>('');
  const [filterChartType, setFilterChartType] = useState<ChartType | ''>('');

  const validSections = ['listening', 'reading', 'writing', 'speaking'];
  const isValidSection = validSections.includes(sectionType);
  const isWritingSection = sectionType === 'writing';

  // Load view mode from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedViewMode = localStorage.getItem(VIEW_MODE_STORAGE_KEY) as ViewMode | null;
      if (savedViewMode && (savedViewMode === 'grid' || savedViewMode === 'list')) {
        setViewMode(savedViewMode);
      }
    }
  }, []);

  // Save view mode to localStorage when changed
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    }
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDifficulty, filterStatus, filterPremium, filterTaskType, filterChartType]);

  // Reset writing filters when section changes
  useEffect(() => {
    if (!isWritingSection) {
      setFilterTaskType('');
      setFilterChartType('');
    }
  }, [sectionType, isWritingSection]);

  const loadData = useCallback(async () => {
    if (!isValidSection) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await getSectionPracticesByType(
        sectionType.toUpperCase() as SectionType,
        {
          difficulty: filterDifficulty || undefined,
          status: filterStatus,
          search: debouncedSearch || undefined,
          is_free: filterPremium === 'all' ? undefined : filterPremium === 'free',
          page: currentPage,
          page_size: 12,
          // Writing-specific filters
          task_type: filterTaskType || undefined,
          chart_type: filterChartType || undefined,
        }
      );
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load practices');
    } finally {
      setLoading(false);
    }
  }, [sectionType, isValidSection, filterDifficulty, filterStatus, filterPremium, filterTaskType, filterChartType, debouncedSearch, currentPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!isValidSection) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Invalid Section
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The section &quot;{sectionType}&quot; does not exist.
          </p>
          <Link
            href="/practice"
            className="text-blue-600 hover:underline"
          >
            Go back to Section Practice
          </Link>
        </div>
      </div>
    );
  }

  const Icon = sectionIcons[sectionType as keyof typeof sectionIcons];
  const colors = sectionColors[sectionType as keyof typeof sectionColors];
  const description = sectionDescriptions[sectionType as keyof typeof sectionDescriptions];

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
                Loading {sectionType} practices...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">❌</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Failed to load
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <Link
          href="/practice"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Section Practice
        </Link>

        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 mb-8 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className={`w-16 h-16 ${colors.light} rounded-2xl flex items-center justify-center shrink-0`}>
              <Icon className={`w-8 h-8 ${colors.text}`} />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white capitalize mb-2">
                {sectionType} Practice
              </h1>
              <p className="text-gray-600 dark:text-gray-400">{description}</p>
            </div>
            {data?.stats && (
              <div className="flex flex-wrap gap-4">
                <div className="text-center px-4">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {data.stats.total_attempts}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Attempts</p>
                </div>
                <div className="text-center px-4 border-l border-gray-200 dark:border-gray-700">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {data.stats.average_score != null ? Number(data.stats.average_score).toFixed(1) : '-'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Score</p>
                </div>
                <div className="text-center px-4 border-l border-gray-200 dark:border-gray-700">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {data.stats.best_score != null ? Number(data.stats.best_score).toFixed(1) : '-'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Best Score</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col gap-4">
            {/* Search Box and View Toggle */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search practices by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                <button
                  onClick={() => handleViewModeChange('list')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">List</span>
                </button>
                <button
                  onClick={() => handleViewModeChange('grid')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden sm:inline">Grid</span>
                </button>
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-gray-500 shrink-0" />
                <div className="flex flex-wrap gap-2">
                  {(['all', 'completed', 'uncompleted'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        filterStatus === status
                          ? status === 'completed'
                            ? 'bg-green-600 text-white'
                            : status === 'uncompleted'
                            ? 'bg-amber-600 text-white'
                            : 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {status === 'all' ? 'All' : status === 'completed' ? 'Completed' : 'Not Done'}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Difficulty Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500 shrink-0" />
                <div className="flex flex-wrap gap-2">
                  {(['', 'EASY', 'MEDIUM', 'HARD', 'EXPERT'] as const).map((diff) => (
                    <button
                      key={diff || 'all'}
                      onClick={() => setFilterDifficulty(diff)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        filterDifficulty === diff
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {diff || 'All'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Premium/Free Filter */}
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-gray-500 shrink-0" />
                <div className="flex flex-wrap gap-2">
                  {(['all', 'free', 'premium'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setFilterPremium(filter)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                        filterPremium === filter
                          ? filter === 'premium'
                            ? 'bg-purple-600 text-white'
                            : filter === 'free'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {filter === 'premium' && <Sparkles className="w-3.5 h-3.5" />}
                      {filter === 'all' ? 'All' : filter === 'free' ? 'Free' : 'Premium'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Writing-specific filters */}
            {isWritingSection && (
              <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-slate-200 dark:border-slate-600">
                {/* Task Type Filter */}
                <div className="flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-gray-500 shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-400 shrink-0">Task:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFilterTaskType('')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        filterTaskType === ''
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      All
                    </button>
                    {data?.available_filters?.task_types?.map((taskType) => (
                      <button
                        key={taskType.value}
                        onClick={() => setFilterTaskType(taskType.value as WritingTaskType)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          filterTaskType === taskType.value
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {taskType.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chart Type Filter (only show when Task 1 is selected or all tasks) */}
                {(filterTaskType === '' || filterTaskType === 'TASK_1') && (
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500 shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-400 shrink-0">Chart:</span>
                    <select
                      value={filterChartType}
                      onChange={(e) => setFilterChartType(e.target.value as ChartType | '')}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-0 focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">All Charts</option>
                      {data?.available_filters?.chart_types?.map((chartType) => (
                        <option key={chartType.value} value={chartType.value}>
                          {chartType.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Active Filters Summary */}
          {(searchQuery || filterDifficulty || filterStatus !== 'all' || filterPremium !== 'all' || filterTaskType || filterChartType) && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-500">Active filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                  Search: &quot;{searchQuery}&quot;
                  <button onClick={() => setSearchQuery('')} className="hover:text-blue-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filterStatus !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs">
                  {filterStatus === 'completed' ? 'Completed' : 'Not Done'}
                  <button onClick={() => setFilterStatus('all')} className="hover:text-green-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filterDifficulty && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs">
                  {filterDifficulty}
                  <button onClick={() => setFilterDifficulty('')} className="hover:text-purple-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filterPremium !== 'all' && (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                  filterPremium === 'premium' 
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {filterPremium === 'premium' && <Sparkles className="w-3 h-3" />}
                  {filterPremium === 'free' ? 'Free' : 'Premium'}
                  <button onClick={() => setFilterPremium('all')} className="hover:opacity-75">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filterTaskType && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-full text-xs">
                  {data?.available_filters?.task_types?.find(t => t.value === filterTaskType)?.label || filterTaskType}
                  <button onClick={() => setFilterTaskType('')} className="hover:text-pink-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filterChartType && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs">
                  {data?.available_filters?.chart_types?.find(t => t.value === filterChartType)?.label || filterChartType}
                  <button onClick={() => setFilterChartType('')} className="hover:text-indigo-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterDifficulty('');
                  setFilterStatus('all');
                  setFilterPremium('all');
                  setFilterTaskType('');
                  setFilterChartType('');
                }}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Loading overlay for subsequent loads */}
        {loading && data && (
          <div className="flex items-center justify-center py-4 mb-4">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mr-2"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Loading...</span>
          </div>
        )}

        {/* Practice Cards */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.practices.map((practice) => (
              <PracticeCard key={practice.uuid} practice={practice} colors={colors} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data?.practices.map((practice) => (
              <PracticeListItem key={practice.uuid} practice={practice} colors={colors} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {data?.practices.length === 0 && (
          <div className="text-center py-12">
            <div className={`w-16 h-16 ${colors.light} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <Icon className={`w-8 h-8 ${colors.text}`} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No practices found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filterDifficulty || filterStatus !== 'all'
                ? 'No practices match your current filters.'
                : 'No practices available for this section yet.'}
            </p>
            {(filterDifficulty || filterStatus !== 'all') && (
              <button
                onClick={() => {
                  setFilterDifficulty('');
                  setFilterStatus('all');
                }}
                className="mt-4 text-blue-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {data?.pagination && data.pagination.total_pages > 1 && (
          <Pagination
            pagination={data.pagination}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}

interface PracticeCardProps {
  practice: SectionPractice;
  colors: {
    gradient: string;
    light: string;
    text: string;
  };
}

function PracticeCard({ practice, colors }: PracticeCardProps) {
  const hasAttempts = practice.attempts_count > 0;
  const hasBestScore = practice.best_score !== null;
  
  // For speaking practices, display part number and topic separately
  const isSpeaking = practice.section_type === 'SPEAKING';
  const speakingPartLabel = isSpeaking && practice.speaking_part 
    ? `Part ${practice.speaking_part}` 
    : null;
    
  // For writing practices, display task type
  const isWriting = practice.section_type === 'WRITING';
  const writingTaskLabel = isWriting && practice.writing_task_type 
    ? practice.writing_task_type === 'TASK_1' ? 'Task 1' : 'Task 2'
    : null;

  return (
    <Link href={`/practice/detail/${practice.uuid}`}>
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            {isSpeaking && speakingPartLabel ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                    {speakingPartLabel}
                  </span>
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getDifficultyColor(practice.difficulty)}`}>
                    {practice.difficulty_display}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                  {practice.speaking_topic_name || practice.title}
                </h3>
              </>
            ) : isWriting && writingTaskLabel ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                    {writingTaskLabel}
                  </span>
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getDifficultyColor(practice.difficulty)}`}>
                    {practice.difficulty_display}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                  {practice.title}
                </h3>
                {practice.writing_prompt_preview && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                    {practice.writing_prompt_preview}
                  </p>
                )}
              </>
            ) : (
              <>
                <h3 className="font-semibold text-gray-900 dark:text-white truncate mb-1">
                  {practice.title}
                </h3>
                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getDifficultyColor(practice.difficulty)}`}>
                  {practice.difficulty_display}
                </span>
              </>
            )}
          </div>
          {practice.is_free && (
            <span className="shrink-0 ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
              Free
            </span>
          )}
        </div>

        {/* Description */}
        {practice.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 flex-1">
            {practice.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{practice.duration}m</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="w-4 h-4" />
            <span>{practice.total_questions} Q</span>
          </div>
          {hasAttempts && (
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>{practice.attempts_count}x</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
          {hasBestScore ? (
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Best: {practice.best_score != null ? Number(practice.best_score).toFixed(1) : '-'}
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-500 dark:text-gray-400">Not attempted</span>
          )}
          <div className={`flex items-center gap-1 ${colors.text} font-medium text-sm`}>
            <Play className="w-4 h-4" />
            <span>{hasAttempts ? 'Retry' : 'Start'}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function PracticeListItem({ practice, colors }: PracticeCardProps) {
  const hasAttempts = practice.attempts_count > 0;
  const hasBestScore = practice.best_score !== null;
  
  // For speaking practices, display part number and topic separately
  const isSpeaking = practice.section_type === 'SPEAKING';
  const speakingPartLabel = isSpeaking && practice.speaking_part 
    ? `Part ${practice.speaking_part}` 
    : null;
    
  // For writing practices, display task type
  const isWriting = practice.section_type === 'WRITING';
  const writingTaskLabel = isWriting && practice.writing_task_type 
    ? practice.writing_task_type === 'TASK_1' ? 'Task 1' : 'Task 2'
    : null;

  return (
    <Link href={`/practice/detail/${practice.uuid}`}>
      <div className="bg-white dark:bg-slate-800 rounded-xl px-5 py-4 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600">
        <div className="flex items-center gap-4">
          {/* Status Indicator */}
          <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
            hasAttempts ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-100 dark:bg-slate-700'
          }`}>
            {hasAttempts ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <Play className={`w-5 h-5 ${colors.text}`} />
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isSpeaking && speakingPartLabel && (
                <span className="shrink-0 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-semibold rounded-full">
                  {speakingPartLabel}
                </span>
              )}
              {isWriting && writingTaskLabel && (
                <span className="shrink-0 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-semibold rounded-full">
                  {writingTaskLabel}
                </span>
              )}
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {isSpeaking && practice.speaking_topic_name ? practice.speaking_topic_name : practice.title}
              </h3>
              {practice.is_free && (
                <span className="shrink-0 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                  Free
                </span>
              )}
            </div>
            {/* Show writing prompt preview in list view */}
            {isWriting && practice.writing_prompt_preview && (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-1">
                {practice.writing_prompt_preview}
              </p>
            )}
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getDifficultyColor(practice.difficulty)}`}>
                {practice.difficulty_display}
              </span>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{practice.duration}m</span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="w-3.5 h-3.5" />
                <span>{practice.total_questions} Q</span>
              </div>
              {hasAttempts && (
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">•</span>
                  <span>{practice.attempts_count} attempt{practice.attempts_count !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>

          {/* Score & Action */}
          <div className="shrink-0 flex items-center gap-4">
            {hasBestScore && (
              <div className="text-right hidden sm:block">
                <div className="flex items-center gap-1 justify-end">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {Number(practice.best_score).toFixed(1)}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Best Score</span>
              </div>
            )}
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>
    </Link>
  );
}

interface PaginationProps {
  pagination: PaginationInfo;
  currentPage: number;
  onPageChange: (page: number) => void;
}

function Pagination({ pagination, currentPage, onPageChange }: PaginationProps) {
  const { total_pages, has_next, has_previous, total_count } = pagination;
  
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;
    
    if (total_pages <= maxVisible + 2) {
      // Show all pages
      for (let i = 1; i <= total_pages; i++) {
        pages.push(i);
      }
    } else {
      // Show first, last, and pages around current
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('ellipsis');
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(total_pages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < total_pages - 2) {
        pages.push('ellipsis');
      }
      
      pages.push(total_pages);
    }
    
    return pages;
  };

  return (
    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Showing <span className="font-medium">{((currentPage - 1) * pagination.page_size) + 1}</span> to{' '}
        <span className="font-medium">{Math.min(currentPage * pagination.page_size, total_count)}</span> of{' '}
        <span className="font-medium">{total_count}</span> results
      </p>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!has_previous}
          className={`p-2 rounded-lg border transition-colors ${
            has_previous
              ? 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
              : 'border-transparent text-gray-400 cursor-not-allowed'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => (
            page === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-400">...</span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`min-w-[40px] h-10 rounded-lg text-sm font-medium transition-colors ${
                  page === currentPage
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {page}
              </button>
            )
          ))}
        </div>
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!has_next}
          className={`p-2 rounded-lg border transition-colors ${
            has_next
              ? 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
              : 'border-transparent text-gray-400 cursor-not-allowed'
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
