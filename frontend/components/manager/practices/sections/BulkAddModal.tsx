'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, CheckSquare, Square, Package, AlertCircle } from 'lucide-react';
import { managerAPI } from '@/lib/manager/api-client';
import { cn } from '@/lib/manager/utils';

interface BulkAddModalProps {
  sectionType: 'listening' | 'reading' | 'writing' | 'speaking';
  onClose: () => void;
  onSuccess: () => void;
}

const SECTION_CONFIG = {
  listening: {
    title: 'Listening Parts',
    fetchAvailable: () => managerAPI.getAvailableListeningContent(),
    bulkCreate: (data: any) => managerAPI.bulkCreateListeningPractices(data),
    getItemLabel: (item: any) => `Part ${item.part_number}: ${item.title}`,
    getItemSublabel: (item: any) => `${item.questions_count} questions${item.has_audio ? ' • Has audio' : ''}`,
  },
  reading: {
    title: 'Reading Passages',
    fetchAvailable: () => managerAPI.getAvailableReadingContent(),
    bulkCreate: (data: any) => managerAPI.bulkCreateReadingPractices(data),
    getItemLabel: (item: any) => `Passage ${item.passage_number}: ${item.title}`,
    getItemSublabel: (item: any) => `${item.questions_count} questions • ${item.word_count} words`,
  },
  writing: {
    title: 'Writing Tasks',
    fetchAvailable: () => managerAPI.getAvailableWritingContent(),
    bulkCreate: (data: any) => managerAPI.bulkCreateWritingPractices(data),
    getItemLabel: (item: any) => item.title,
    getItemSublabel: (item: any) => `${item.task_type_display}${item.chart_type_display ? ` • ${item.chart_type_display}` : ''}`,
  },
  speaking: {
    title: 'Speaking Topics',
    fetchAvailable: () => managerAPI.getAvailableSpeakingContent(),
    bulkCreate: (data: any) => managerAPI.bulkCreateSpeakingPractices(data),
    getItemLabel: (item: any) => item.title,
    getItemSublabel: (item: any) => `${item.speaking_type_display} • ${item.questions_count} questions`,
  },
};

export function BulkAddModal({ sectionType, onClose, onSuccess }: BulkAddModalProps) {
  const config = SECTION_CONFIG[sectionType];
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableContent, setAvailableContent] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<any>(null);

  // Default options
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [isFree, setIsFree] = useState(true);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await config.fetchAvailable();
        setAvailableContent(response.content || []);
      } catch (error) {
        console.error('Error fetching available content:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [sectionType]);

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === availableContent.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(availableContent.map((c) => c.id)));
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;

    setSubmitting(true);
    try {
      const response = await config.bulkCreate({
        content_ids: Array.from(selectedIds),
        default_difficulty: difficulty,
        default_is_free: isFree,
        default_is_active: isActive,
      });
      setResult(response);
      
      // Auto-close after 2 seconds on success
      if (response.summary?.created_count > 0) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (error) {
      console.error('Error bulk creating practices:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Bulk Add {config.title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Select content to create practices from
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Result Display */}
        {result && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-3">
              {result.summary?.created_count > 0 ? (
                <CheckSquare className="w-5 h-5 text-green-500 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
              )}
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{result.message}</p>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-green-600">Created: {result.summary?.created_count || 0}</span>
                  {' • '}
                  <span className="text-yellow-600">Skipped: {result.summary?.skipped_count || 0}</span>
                  {' • '}
                  <span className="text-red-600">Errors: {result.summary?.error_count || 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : availableContent.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No available content</p>
              <p className="text-sm">All {config.title.toLowerCase()} are already linked to practices</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Default Settings */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-3">
                <h3 className="font-medium text-gray-900 dark:text-white text-sm">Default Settings</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Difficulty</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                      <option value="EXPERT">Expert</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Access</label>
                    <select
                      value={isFree ? 'free' : 'premium'}
                      onChange={(e) => setIsFree(e.target.value === 'free')}
                      className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <option value="free">Free</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
                    <select
                      value={isActive ? 'active' : 'inactive'}
                      onChange={(e) => setIsActive(e.target.value === 'active')}
                      className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Select All */}
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {selectedIds.size === availableContent.length ? (
                    <>
                      <CheckSquare className="w-4 h-4" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4" />
                      Select All ({availableContent.length})
                    </>
                  )}
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedIds.size} selected
                </span>
              </div>

              {/* Content List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {availableContent.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleSelection(item.id)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      selectedIds.has(item.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    )}
                  >
                    {selectedIds.has(item.id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-500" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {config.getItemLabel(item)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {config.getItemSublabel(item)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button
              onClick={handleSubmit}
              disabled={submitting || selectedIds.size === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  Create {selectedIds.size} Practices
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
