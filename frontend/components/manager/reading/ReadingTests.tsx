/**
 * Reading Tests Component
 * Comprehensive reading passage management with enhanced UI and features
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  FileText,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  getReadingPassages,
  deleteReadingPassage,
} from '@/lib/api/reading';
import type { ReadingPassage, PassageNumber } from '@/types/reading';
import { LoadingSpinner, EmptyState, StatsCard } from '@/components/manager/shared';

export function ReadingTests() {
  const router = useRouter();
  const [passages, setPassages] = useState<ReadingPassage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedPassageFilter, setSelectedPassageFilter] = useState<PassageNumber | null>(null);

  const perPage = 25;

  // Statistics
  const stats = useMemo(() => {
    return {
      totalPassages: passages.length,
      totalQuestions: passages.reduce((sum, p) => sum + (p.test_heads?.length || 0), 0),
      passage1Count: passages.filter((p) => p.passage_number === 1).length,
      passage2Count: passages.filter((p) => p.passage_number === 2).length,
      passage3Count: passages.filter((p) => p.passage_number === 3).length,
    };
  }, [passages]);

  // Filtered passages
  const filteredPassages = useMemo(() => {
    let filtered = passages;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (passage) =>
          passage.title?.toLowerCase().includes(query) ||
          passage.content?.toLowerCase().includes(query)
      );
    }

    if (selectedPassageFilter) {
      filtered = filtered.filter((p) => p.passage_number === selectedPassageFilter);
    }

    return filtered;
  }, [passages, searchQuery, selectedPassageFilter]);

  const hasFilters = searchQuery || selectedPassageFilter;

  // Fetch passages
  const fetchPassages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getReadingPassages({
        page: currentPage,
        per_page: perPage,
      });

      setPassages(response.passages || []);

      if (response.pagination) {
        setTotalPages(response.pagination.total_pages);
        setCurrentPage(response.pagination.current_page);
        setTotalItems(response.pagination.total_items);
      }
    } catch (error) {
      console.error('Error fetching passages:', error);
      alert('Failed to load reading passages');
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchPassages();
  }, [fetchPassages]);

  // Handle actions
  const handleCreatePassage = () => {
    router.push('/manager/reading/create');
  };

  const handleEditPassage = (id: number) => {
    router.push(`/manager/reading/edit/${id}`);
  };

  const handleDeletePassage = async (id: number) => {
    if (!confirm('Are you sure you want to delete this passage?')) return;

    try {
      await deleteReadingPassage(id);
      await fetchPassages();
    } catch (error) {
      console.error('Error deleting passage:', error);
      alert('Failed to delete passage');
    }
  };

  const handleViewPassage = (id: number) => {
    router.push(`/manager/reading/view/${id}`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedPassageFilter(null);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading && passages.length === 0) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Reading Tests</h1>
              <p className="text-sm text-slate-600 mt-1 dark:text-slate-300">
                Manage reading passages, test heads, and questions
              </p>
            </div>
          </div>
          <button
            onClick={handleCreatePassage}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors inline-flex items-center gap-2 dark:bg-orange-500 dark:hover:bg-orange-600"
          >
            <Plus className="w-5 h-5" />
            New Passage
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Passages"
          value={stats.totalPassages}
          icon={FileText}
          variant="primary"
        />
        <StatsCard
          title="Passage 1"
          value={stats.passage1Count}
          icon={BookOpen}
          variant="default"
        />
        <StatsCard
          title="Passage 2"
          value={stats.passage2Count}
          icon={BookOpen}
          variant="success"
        />
        <StatsCard
          title="Passage 3"
          value={stats.passage3Count}
          icon={BookOpen}
          variant="warning"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search passages..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
              />
            </div>
          </div>

          {/* Passage Number Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            <select
              value={selectedPassageFilter || ''}
              onChange={(e) =>
                setSelectedPassageFilter(e.target.value ? (parseInt(e.target.value) as PassageNumber) : null)
              }
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            >
              <option value="">All Passages</option>
              <option value="1">Passage 1</option>
              <option value="2">Passage 2</option>
              <option value="3">Passage 3</option>
            </select>
          </div>

          {/* Clear Filters */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-gray-700"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Passages List */}
      {filteredPassages.length === 0 ? (
        <EmptyState
          icon="BookOpen"
          title="No passages found"
          description={
            hasFilters
              ? 'No passages match your search criteria'
              : 'Get started by creating your first reading passage'
          }
          actionText={!hasFilters ? 'Create First Passage' : undefined}
          onAction={!hasFilters ? handleCreatePassage : undefined}
        />
      ) : (
        <>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 dark:bg-gray-700 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Passage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Word Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Test Heads
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-gray-700">
                  {filteredPassages.map((passage) => (
                    <tr key={passage.id} className="hover:bg-slate-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
                          Passage {passage.passage_number}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {passage.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          {passage.word_count || 0} words
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-slate-400 dark:text-slate-300" />
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            {passage.test_heads?.length || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          {new Date(passage.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewPassage(passage.id)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors dark:text-gray-300 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditPassage(passage.id)}
                            className="p-1.5 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors dark:text-gray-300 dark:hover:text-orange-300 dark:hover:bg-orange-900/10"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePassage(passage.id)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors dark:text-gray-300 dark:hover:text-rose-300 dark:hover:bg-rose-900/10"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Showing {passages.length} of {totalItems} passages
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-slate-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
