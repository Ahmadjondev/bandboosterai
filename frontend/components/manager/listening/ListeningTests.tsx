/**
 * Listening Tests Component
 * React implementation ported from the legacy Vue manager app
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Headphones,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  FileAudio,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { managerAPI } from '@/lib/manager/api-client';
import type { ListeningPart } from '@/types/manager';
import { LoadingSpinner, EmptyState, StatsCard } from '@/components/manager/shared';

export function ListeningTests() {
  const router = useRouter();
  const [parts, setParts] = useState<ListeningPart[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const perPage = 25;

  const stats = useMemo(() => {
    return {
      totalParts: parts.length,
      totalQuestions: parts.reduce((s, p) => s + (p.total_questions || 0), 0),
      activeParts: parts.filter((p) => p.is_active).length,
    };
  }, [parts]);

  const filtered = useMemo(() => {
    if (!searchQuery) return parts;
    const q = searchQuery.toLowerCase();
    return parts.filter(
      (p) => p.title?.toLowerCase().includes(q) || p.transcript?.toLowerCase().includes(q)
    );
  }, [parts, searchQuery]);

  const fetchParts = useCallback(async () => {
    setLoading(true);
    try {
      const resp: any = await managerAPI.getListeningParts({ page: currentPage, per_page: perPage });

      // Backend returns { parts: [...], pagination: { total_items, total_pages, current_page } }
      // Older managerAPI shape uses { results: [...], count }
      const items = resp.results ?? resp.parts ?? [];
      const pagination = resp.pagination ?? null;

      setParts(items || []);

      if (typeof resp.count === 'number') {
        setTotalItems(resp.count);
        setTotalPages(Math.max(1, Math.ceil(resp.count / perPage)));
      } else if (pagination) {
        // pagination probably contains total_items and total_pages
        setTotalItems(pagination.total_items ?? pagination.count ?? items.length);
        setTotalPages(pagination.total_pages ?? Math.max(1, Math.ceil((pagination.total_items ?? items.length) / perPage)));
        setCurrentPage(pagination.current_page ?? currentPage);
      } else {
        setTotalItems(items.length);
        setTotalPages(Math.max(1, Math.ceil(items.length / perPage)));
      }
    } catch (err) {
      console.error('Error fetching listening parts', err);
      alert('Failed to load listening parts');
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  const handleCreate = () => router.push('/manager/listening/create');
  const handleEdit = (id: number) => router.push(`/manager/listening/edit/${id}`);
  const handleView = (id: number) => router.push(`/manager/listening/view/${id}`);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this listening part?')) return;
    try {
      await managerAPI.deleteListeningPart(id);
      await fetchParts();
    } catch (err) {
      console.error('Delete failed', err);
      alert('Failed to delete listening part');
    }
  };

  const clearFilters = () => setSearchQuery('');

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  if (loading && parts.length === 0) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Headphones className="w-8 h-8 text-emerald-600" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Listening Parts</h1>
            <p className="text-sm text-slate-600 mt-1">Manage listening parts and audio files</p>
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Part
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard title="Total Parts" value={stats.totalParts} icon={FileAudio} variant="primary" />
        <StatsCard title="Total Questions" value={stats.totalQuestions} icon={Headphones} variant="default" />
        <StatsCard title="Active Parts" value={stats.activeParts} icon={Headphones} variant="success" />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search listening parts..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-600" />
            <button onClick={clearFilters} className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="Headphones"
          title="No listening parts"
          description={searchQuery ? 'No parts match your search' : 'Create your first listening part to get started'}
          actionText={!searchQuery ? 'Create First Part' : undefined}
          onAction={!searchQuery ? handleCreate : undefined}
        />
      ) : (
        <>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Part</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Questions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Audio</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.map((part) => (
                    <tr key={part.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">Part {part.part_number}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">{part.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-600">{part.total_questions || 0}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {part.audio_url ? (
                            <a href={part.audio_url} target="_blank" rel="noreferrer" className="text-sm text-emerald-600 hover:underline inline-flex items-center gap-2">
                              <FileAudio className="w-4 h-4" />
                              Listen
                            </a>
                          ) : (
                            <span className="text-sm text-slate-500">No audio</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-600">{new Date(part.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleView(part.id)} className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="View"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => handleEdit(part.id)} className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(part.id)} className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-slate-600">Showing {parts.length} of {totalItems} parts</div>
              <div className="flex items-center gap-2">
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft className="w-5 h-5" /></button>
                <span className="text-sm text-slate-600">Page {currentPage} of {totalPages}</span>
                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ListeningTests;
