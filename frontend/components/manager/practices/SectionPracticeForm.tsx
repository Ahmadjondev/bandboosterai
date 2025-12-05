'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, BookOpen, Headphones, Edit3, Mic } from 'lucide-react';
import { managerAPI } from '@/lib/manager/api-client';
import type {
  SectionPracticeItem,
  SectionType,
  AvailableContentItem,
  PracticeDifficultyLevel,
} from '@/types/manager/section-practices';
import { cn } from '@/lib/manager/utils';

interface SectionPracticeFormProps {
  practice: SectionPracticeItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

const SECTION_ICONS: Record<string, React.ElementType> = {
  reading: BookOpen,
  listening: Headphones,
  writing: Edit3,
  speaking: Mic,
};

const DEFAULT_DURATIONS: Record<SectionType, number> = {
  reading: 20,
  listening: 10,
  writing: 40,
  speaking: 14,
};

export function SectionPracticeForm({
  practice,
  onClose,
  onSuccess,
}: SectionPracticeFormProps) {
  const isEditing = !!practice;
  
  const [loading, setLoading] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [availableContent, setAvailableContent] = useState<{
    reading?: AvailableContentItem[];
    listening?: AvailableContentItem[];
    writing?: AvailableContentItem[];
    speaking?: AvailableContentItem[];
  }>({});
  
  // Form state
  const [sectionType, setSectionType] = useState<SectionType>(
    (practice?.section_type?.toLowerCase() as SectionType) || 'reading'
  );
  const [title, setTitle] = useState(practice?.title || '');
  const [description, setDescription] = useState(practice?.description || '');
  const [difficulty, setDifficulty] = useState<PracticeDifficultyLevel>(
    practice?.difficulty || 'MEDIUM'
  );
  const [durationMinutes, setDurationMinutes] = useState(
    practice?.duration_minutes || DEFAULT_DURATIONS.reading
  );
  const [isFree, setIsFree] = useState(practice?.is_free || false);
  const [isActive, setIsActive] = useState(practice?.is_active ?? true);
  const [selectedContentId, setSelectedContentId] = useState<number | null>(
    practice?.content?.id || null
  );
  
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableContent();
  }, []);

  useEffect(() => {
    // Update duration when section type changes (only for new practices)
    if (!isEditing) {
      setDurationMinutes(DEFAULT_DURATIONS[sectionType]);
    }
  }, [sectionType, isEditing]);

  const fetchAvailableContent = async () => {
    try {
      setLoadingContent(true);
      const data = await managerAPI.getPracticeAvailableContent();
      setAvailableContent(data);
    } catch (error) {
      console.error('Error fetching available content:', error);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!isEditing && !selectedContentId) {
      setError('Please select content for this practice');
      return;
    }

    try {
      setLoading(true);

      if (isEditing) {
        await managerAPI.updateSectionPractice(practice!.id, {
          title,
          description,
          difficulty,
          duration_minutes: durationMinutes,
          is_free: isFree,
          is_active: isActive,
        });
      } else {
        const contentIdField = `${sectionType === 'reading' ? 'reading_passage_id' : 
          sectionType === 'listening' ? 'listening_part_id' :
          sectionType === 'writing' ? 'writing_task_id' : 'speaking_topic_id'}`;
        
        await managerAPI.createSectionPractice({
          section_type: sectionType,
          title,
          description,
          difficulty,
          duration_minutes: durationMinutes,
          is_free: isFree,
          is_active: isActive,
          [contentIdField]: selectedContentId,
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving practice:', error);
      setError(error.message || 'Failed to save practice');
    } finally {
      setLoading(false);
    }
  };

  const currentContent = availableContent[sectionType] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/60 dark:bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Practice' : 'Create New Practice'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-130px)]">
          <div className="px-6 py-4 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Section Type (only for new practices) */}
            {!isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Section Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['reading', 'listening', 'writing', 'speaking'] as SectionType[]).map((type) => {
                    const Icon = SECTION_ICONS[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setSectionType(type);
                          setSelectedContentId(null);
                        }}
                        className={cn(
                          'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                          sectionType === type
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        )}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-sm font-medium capitalize">{type}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Content Selection (only for new practices) */}
            {!isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Content
                </label>
                {loadingContent ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : currentContent.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-3">
                    No available {sectionType} content. Create some {sectionType} tests first.
                  </p>
                ) : (
                  <select
                    value={selectedContentId || ''}
                    onChange={(e) => setSelectedContentId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    required
                  >
                    <option value="">Select {sectionType} content...</option>
                    {currentContent.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                        {item.extra_info && ` (${item.extra_info})`}
                        {item.task_type && ` - ${item.task_type.replace('_', ' ')}`}
                        {item.chart_type && ` - ${item.chart_type.replace('_', ' ')}`}
                        {item.part_number && ` - Part ${item.part_number}`}
                        {item.topic_type && ` - ${item.topic_type.replace('_', ' ')}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter practice title"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter practice description"
                rows={3}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
              />
            </div>

            {/* Difficulty & Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as PracticeDifficultyLevel)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                >
                  <option value="EASY">Easy (Band 4-5)</option>
                  <option value="MEDIUM">Medium (Band 5.5-6.5)</option>
                  <option value="HARD">Hard (Band 7-8)</option>
                  <option value="EXPERT">Expert (Band 8.5-9)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  min={1}
                  max={120}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
            </div>

            {/* Free & Active toggles */}
            <div className="flex gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={(e) => setIsFree(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary/50"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Free Access
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary/50"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active
                </span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (!isEditing && !selectedContentId)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Practice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
