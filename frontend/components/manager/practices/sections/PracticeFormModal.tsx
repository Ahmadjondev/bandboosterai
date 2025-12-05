'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { managerAPI } from '@/lib/manager/api-client';

interface PracticeFormModalProps {
  sectionType: 'listening' | 'reading' | 'writing' | 'speaking';
  practice?: any; // null for create, object for edit
  onClose: () => void;
  onSuccess: () => void;
}

const SECTION_CONFIG = {
  listening: {
    fetchAvailable: () => managerAPI.getAvailableListeningContent(),
    create: (data: any) => managerAPI.createListeningPractice(data),
    update: (id: number, data: any) => managerAPI.updateListeningPractice(id, data),
    getContentLabel: (item: any) => `Part ${item.part_number}: ${item.title}`,
  },
  reading: {
    fetchAvailable: () => managerAPI.getAvailableReadingContent(),
    create: (data: any) => managerAPI.createReadingPractice(data),
    update: (id: number, data: any) => managerAPI.updateReadingPractice(id, data),
    getContentLabel: (item: any) => `Passage ${item.passage_number}: ${item.title}`,
  },
  writing: {
    fetchAvailable: () => managerAPI.getAvailableWritingContent(),
    create: (data: any) => managerAPI.createWritingPractice(data),
    update: (id: number, data: any) => managerAPI.updateWritingPractice(id, data),
    getContentLabel: (item: any) => item.title,
  },
  speaking: {
    fetchAvailable: () => managerAPI.getAvailableSpeakingContent(),
    create: (data: any) => managerAPI.createSpeakingPractice(data),
    update: (id: number, data: any) => managerAPI.updateSpeakingPractice(id, data),
    getContentLabel: (item: any) => item.title,
  },
};

export function PracticeFormModal({
  sectionType,
  practice,
  onClose,
  onSuccess,
}: PracticeFormModalProps) {
  const config = SECTION_CONFIG[sectionType];
  const isEdit = !!practice;

  const [loading, setLoading] = useState(!isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [availableContent, setAvailableContent] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [contentId, setContentId] = useState<number | ''>(practice?.content?.id || '');
  const [title, setTitle] = useState(practice?.title || '');
  const [description, setDescription] = useState(practice?.description || '');
  const [difficulty, setDifficulty] = useState(practice?.difficulty || 'MEDIUM');
  const [durationMinutes, setDurationMinutes] = useState(practice?.duration_minutes || '');
  const [isFree, setIsFree] = useState(practice?.is_free ?? true);
  const [isActive, setIsActive] = useState(practice?.is_active ?? true);
  const [order, setOrder] = useState(practice?.order || 0);

  useEffect(() => {
    if (!isEdit) {
      const fetchContent = async () => {
        try {
          const response = await config.fetchAvailable();
          setAvailableContent(response.content || []);
        } catch (err) {
          console.error('Error fetching available content:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchContent();
    }
  }, [isEdit, sectionType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isEdit) {
        await config.update(practice.id, {
          title,
          description,
          difficulty,
          duration_minutes: durationMinutes || null,
          is_free: isFree,
          is_active: isActive,
          order,
        });
      } else {
        if (!contentId) {
          setError('Please select content');
          setSubmitting(false);
          return;
        }
        await config.create({
          content_id: contentId,
          title: title || undefined,
          description,
          difficulty,
          duration_minutes: durationMinutes || undefined,
          is_free: isFree,
          is_active: isActive,
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Practice' : `Create ${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)} Practice`}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {/* Content Selection (only for create) */}
              {!isEdit && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select Content *
                  </label>
                  <select
                    value={contentId}
                    onChange={(e) => setContentId(Number(e.target.value) || '')}
                    required
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select content...</option>
                    {availableContent.map((item) => (
                      <option key={item.id} value={item.id}>
                        {config.getContentLabel(item)}
                      </option>
                    ))}
                  </select>
                  {availableContent.length === 0 && (
                    <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
                      No available content. All items are already linked to practices.
                    </p>
                  )}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title {!isEdit && '(optional - auto-generated)'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isEdit ? '' : 'Leave empty to auto-generate'}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="EASY">Easy (Band 4-5)</option>
                    <option value="MEDIUM">Medium (Band 5.5-6.5)</option>
                    <option value="HARD">Hard (Band 7-8)</option>
                    <option value="EXPERT">Expert (Band 8.5-9)</option>
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Auto"
                    min={1}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Access */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Access
                  </label>
                  <select
                    value={isFree ? 'free' : 'premium'}
                    onChange={(e) => setIsFree(e.target.value === 'free')}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={isActive ? 'active' : 'inactive'}
                    onChange={(e) => setIsActive(e.target.value === 'active')}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Order (only for edit) */}
              {isEdit && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={order}
                    onChange={(e) => setOrder(Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || loading || (!isEdit && availableContent.length === 0)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEdit ? 'Save Changes' : 'Create Practice'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
