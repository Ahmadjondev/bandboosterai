'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { managerAPI } from '@/lib/manager/api-client';
import { LoadingSpinner } from '@/components/manager/shared';
import { cn } from '@/lib/manager/utils';
import {
  ArrowLeft,
  Package,
  Plus,
  Save,
  Trash2,
  RotateCcw,
  CheckSquare,
  Square,
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  GripVertical,
  MoveUp,
  MoveDown,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
} from 'lucide-react';

interface Props {
  sectionType: 'listening' | 'reading' | 'writing' | 'speaking';
}

interface ContentItem {
  id: number;
  title: string;
  // Section-specific fields
  part_number?: number;
  passage_number?: number;
  task_type?: string;
  task_type_display?: string;
  chart_type?: string;
  chart_type_display?: string;
  speaking_type?: string;
  speaking_type_display?: string;
  questions_count?: number;
  word_count?: number;
  has_audio?: boolean;
  difficulty?: string;
}

interface PracticeRow {
  temp_id: string;
  content_id: number | null;
  content?: ContentItem;
  title: string;
  description: string;
  difficulty: string;
  duration_minutes: number | null;
  is_free: boolean;
  is_active: boolean;
  _deleted?: boolean;
}

const SECTION_CONFIG = {
  listening: {
    title: 'Listening Practices',
    icon: Headphones,
    color: 'blue',
    fetchAvailable: () => managerAPI.getAvailableListeningContent(),
    bulkCreate: (data: any) => managerAPI.bulkCreateListeningPractices(data),
    getContentLabel: (item: ContentItem) => `Part ${item.part_number}: ${item.title}`,
    getContentSublabel: (item: ContentItem) => `${item.questions_count || 0} questions${item.has_audio ? ' • Has audio' : ''}`,
  },
  reading: {
    title: 'Reading Practices',
    icon: BookOpen,
    color: 'green',
    fetchAvailable: () => managerAPI.getAvailableReadingContent(),
    bulkCreate: (data: any) => managerAPI.bulkCreateReadingPractices(data),
    getContentLabel: (item: ContentItem) => `Passage ${item.passage_number}: ${item.title}`,
    getContentSublabel: (item: ContentItem) => `${item.questions_count || 0} questions • ${item.word_count || 0} words`,
  },
  writing: {
    title: 'Writing Practices',
    icon: PenTool,
    color: 'purple',
    fetchAvailable: () => managerAPI.getAvailableWritingContent(),
    bulkCreate: (data: any) => managerAPI.bulkCreateWritingPractices(data),
    getContentLabel: (item: ContentItem) => item.title,
    getContentSublabel: (item: ContentItem) => `${item.task_type_display || item.task_type}${item.chart_type_display ? ` • ${item.chart_type_display}` : ''}`,
  },
  speaking: {
    title: 'Speaking Practices',
    icon: Mic,
    color: 'orange',
    fetchAvailable: () => managerAPI.getAvailableSpeakingContent(),
    bulkCreate: (data: any) => managerAPI.bulkCreateSpeakingPractices(data),
    getContentLabel: (item: ContentItem) => item.title,
    getContentSublabel: (item: ContentItem) => `${item.speaking_type_display || item.speaking_type} • ${item.questions_count || 0} questions`,
  },
};

const DIFFICULTY_OPTIONS = [
  { value: 'EASY', label: 'Easy (Band 4-5)', color: 'bg-green-100 text-green-700' },
  { value: 'MEDIUM', label: 'Medium (Band 5.5-6.5)', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'HARD', label: 'Hard (Band 7-8)', color: 'bg-orange-100 text-orange-700' },
  { value: 'EXPERT', label: 'Expert (Band 8.5-9)', color: 'bg-red-100 text-red-700' },
];

export default function BulkPracticesManager({ sectionType }: Props) {
  const router = useRouter();
  const config = SECTION_CONFIG[sectionType];
  const Icon = config.icon;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableContent, setAvailableContent] = useState<ContentItem[]>([]);
  const [rows, setRows] = useState<PracticeRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string[]>>({});

  // Selection dialog
  const [showContentDialog, setShowContentDialog] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch available content
  useEffect(() => {
    const currentConfig = SECTION_CONFIG[sectionType];
    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await currentConfig.fetchAvailable();
        setAvailableContent(response.content || []);
      } catch (err: any) {
        console.error('Error fetching available content:', err);
        if (err.name === 'AuthenticationError') {
          setError('Session expired. Please refresh the page and try again.');
        } else {
          setError(err.message || 'Failed to load available content');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [sectionType]);

  const generateTempId = () => Math.random().toString(36).substring(2, 9);

  const addEmptyRow = () => {
    const newRow: PracticeRow = {
      temp_id: generateTempId(),
      content_id: null,
      title: '',
      description: '',
      difficulty: 'MEDIUM',
      duration_minutes: null,
      is_free: true,
      is_active: true,
    };
    setRows(prev => [...prev, newRow]);
  };

  const addRowsFromSelected = (contentIds: number[]) => {
    const newRows: PracticeRow[] = contentIds.map(id => {
      const content = availableContent.find(c => c.id === id);
      return {
        temp_id: generateTempId(),
        content_id: id,
        content,
        title: content ? config.getContentLabel(content) : '',
        description: '',
        difficulty: 'MEDIUM',
        duration_minutes: null,
        is_free: true,
        is_active: true,
      };
    });
    setRows(prev => [...prev, ...newRows]);
    // Remove selected content from available
    setAvailableContent(prev => prev.filter(c => !contentIds.includes(c.id)));
  };

  const deleteRow = (index: number) => {
    const row = rows[index];
    // Return content to available list if it was selected
    if (row.content_id && row.content) {
      setAvailableContent(prev => [...prev, row.content!]);
    }
    setRows(prev => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
    // Clear row errors
    setRowErrors(prev => {
      const copy = { ...prev };
      delete copy[row.temp_id];
      return copy;
    });
  };

  const updateRow = (index: number, field: keyof PracticeRow, value: any) => {
    setRows(prev => {
      const copy = [...prev];
      (copy[index] as any)[field] = value;
      return copy;
    });
    // Clear row errors
    const tempId = rows[index]?.temp_id;
    if (tempId) {
      setRowErrors(prev => {
        const copy = { ...prev };
        delete copy[tempId];
        return copy;
      });
    }
  };

  const selectContent = (index: number, content: ContentItem) => {
    // Remove from available
    setAvailableContent(prev => prev.filter(c => c.id !== content.id));
    // Return old content to available if any
    const oldContent = rows[index]?.content;
    if (oldContent) {
      setAvailableContent(prev => [...prev, oldContent]);
    }
    // Update row
    setRows(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        content_id: content.id,
        content,
        title: copy[index].title || config.getContentLabel(content),
      };
      return copy;
    });
    setShowContentDialog(false);
    setSelectedRowIndex(null);
  };

  const moveRow = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index <= 0) return;
    if (direction === 'down' && index >= rows.length - 1) return;

    setRows(prev => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [copy[index], copy[targetIndex]] = [copy[targetIndex], copy[index]];
      return copy;
    });
  };

  const validateRows = (): boolean => {
    const errors: Record<string, string[]> = {};
    let hasErrors = false;

    rows.forEach(row => {
      const rowErrors: string[] = [];
      if (!row.content_id) {
        rowErrors.push('Please select content');
      }
      if (!row.title.trim()) {
        rowErrors.push('Title is required');
      }
      if (rowErrors.length > 0) {
        errors[row.temp_id] = rowErrors;
        hasErrors = true;
      }
    });

    setRowErrors(errors);
    return !hasErrors;
  };

  const saveAll = async () => {
    setError(null);
    setSuccess(null);

    if (rows.length === 0) {
      setError('Please add at least one practice to save');
      return;
    }

    if (!validateRows()) {
      setError('Please fix the errors in the marked rows');
      return;
    }

    setSaving(true);
    try {
      const response = await config.bulkCreate({
        content_ids: rows.map(r => r.content_id),
        default_difficulty: rows[0]?.difficulty || 'MEDIUM',
        default_is_free: rows[0]?.is_free ?? true,
        default_is_active: rows[0]?.is_active ?? true,
      });

      if (response.summary?.created_count > 0) {
        setSuccess(`Successfully created ${response.summary.created_count} practices!`);
        // Clear rows after success
        setTimeout(() => {
          setRows([]);
        }, 1500);
      } else if (response.summary?.skipped_count > 0) {
        setError(`${response.summary.skipped_count} items were skipped (already exist)`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save practices');
    } finally {
      setSaving(false);
    }
  };

  const applyToAll = (field: 'difficulty' | 'is_free' | 'is_active', value: any) => {
    setRows(prev => prev.map(row => ({ ...row, [field]: value })));
  };

  const filteredAvailableContent = availableContent.filter(content =>
    config.getContentLabel(content).toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              config.color === 'blue' && 'bg-blue-100 dark:bg-blue-900/30',
              config.color === 'green' && 'bg-green-100 dark:bg-green-900/30',
              config.color === 'purple' && 'bg-purple-100 dark:bg-purple-900/30',
              config.color === 'orange' && 'bg-orange-100 dark:bg-orange-900/30',
            )}>
              <Icon className={cn(
                'w-6 h-6',
                config.color === 'blue' && 'text-blue-600 dark:text-blue-400',
                config.color === 'green' && 'text-green-600 dark:text-green-400',
                config.color === 'purple' && 'text-purple-600 dark:text-purple-400',
                config.color === 'orange' && 'text-orange-600 dark:text-orange-400',
              )} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Bulk Add {config.title}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Create multiple practices at once from available content
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm py-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
            <Package className="w-4 h-4" />
            <span>Practices to create:</span>
            <span className="font-bold text-gray-900 dark:text-white">{rows.length}</span>
          </div>
          <div className="text-sm text-gray-500">
            {availableContent.length} available content items
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRows([])}
            disabled={rows.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            Clear All
          </button>
          <button
            onClick={saveAll}
            disabled={saving || rows.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <LoadingSpinner size="small" /> : <Save className="w-4 h-4" />}
            Save All Practices
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl border border-green-200 dark:border-green-800">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Available Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Available Content ({availableContent.length})
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search content..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAvailableContent.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No matching content found' : 'All content has been added to practices'}
              </div>
            ) : (
              filteredAvailableContent.map((content) => (
                <div
                  key={content.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
                  onClick={() => addRowsFromSelected([content.id])}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {config.getContentLabel(content)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {config.getContentSublabel(content)}
                      </p>
                    </div>
                    <button className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {availableContent.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <button
                onClick={() => addRowsFromSelected(availableContent.map(c => c.id))}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add All ({availableContent.length})
              </button>
            </div>
          )}
        </div>

        {/* Right: Practices to Create */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Practices to Create ({rows.length})
              </h3>
              {rows.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => applyToAll('difficulty', e.target.value)}
                    className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 border-0 rounded"
                  >
                    <option value="">Set all difficulty...</option>
                    {DIFFICULTY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {rows.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p>Click on content items to add them here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {rows.map((row, index) => (
                  <div
                    key={row.temp_id}
                    className={cn(
                      'p-4 transition-colors',
                      rowErrors[row.temp_id] && 'bg-red-50 dark:bg-red-900/10'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col gap-1 pt-1">
                        <button
                          onClick={() => moveRow(index, 'up')}
                          disabled={index === 0}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                        >
                          <MoveUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => moveRow(index, 'down')}
                          disabled={index === rows.length - 1}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                        >
                          <MoveDown className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex-1 space-y-3">
                        {/* Content Info */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {row.content ? config.getContentLabel(row.content) : 'No content selected'}
                            </p>
                            {row.content && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {config.getContentSublabel(row.content)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Title */}
                        <input
                          type="text"
                          value={row.title}
                          onChange={(e) => updateRow(index, 'title', e.target.value)}
                          placeholder="Practice title..."
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        {/* Options Row */}
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={row.difficulty}
                            onChange={(e) => updateRow(index, 'difficulty', e.target.value)}
                            className="text-xs px-2 py-1.5 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg"
                          >
                            {DIFFICULTY_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                            <input
                              type="checkbox"
                              checked={row.is_free}
                              onChange={(e) => updateRow(index, 'is_free', e.target.checked)}
                              className="rounded"
                            />
                            Free
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                            <input
                              type="checkbox"
                              checked={row.is_active}
                              onChange={(e) => updateRow(index, 'is_active', e.target.checked)}
                              className="rounded"
                            />
                            Active
                          </label>
                        </div>

                        {/* Row Errors */}
                        {rowErrors[row.temp_id] && (
                          <div className="text-xs text-red-600 dark:text-red-400">
                            {rowErrors[row.temp_id].join(', ')}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => deleteRow(index)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
