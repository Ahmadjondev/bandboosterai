'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { managerAPI } from '@/lib/manager';
import type { SectionForm, SectionType, AvailableContent } from '@/types/manager/books';
import type { BookSection } from '@/types/books';
import { LoadingSpinner, Alert } from '@/components/manager/shared';

interface SectionFormComponentProps {
  sectionId?: number;
  initialData?: BookSection;
  bookId?: number;
}

export default function SectionFormComponent({
  sectionId,
  initialData,
  bookId: propBookId,
}: SectionFormComponentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryBookId = searchParams.get('book_id');
  const effectiveBookId = propBookId || (queryBookId ? parseInt(queryBookId) : undefined);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchingContent, setSearchingContent] = useState(false);
  const [availableContent, setAvailableContent] = useState<AvailableContent[]>([]);

  const [formData, setFormData] = useState<SectionForm>({
    book: initialData?.book || effectiveBookId || 0,
    section_type: initialData?.section_type || 'READING',
    title: initialData?.title || '',
    reading_passage: initialData?.reading_passage?.id || null,
    listening_part: initialData?.listening_part?.id || null,
    order: initialData?.order || undefined,
    description: initialData?.description || '',
    duration_minutes: initialData?.duration_minutes || undefined,
    is_locked: initialData?.is_locked || false,
  });

  const [contentSearch, setContentSearch] = useState('');

  // Fetch available content when section type changes
  useEffect(() => {
    const fetchContent = async () => {
      if (!formData.section_type) return;

      setSearchingContent(true);
      try {
        const type = formData.section_type === 'READING' ? 'reading' : 'listening';
        const response = await managerAPI.getAvailableContent(type, contentSearch);
        setAvailableContent(response.content);
      } catch (err: any) {
        console.error('Failed to fetch content:', err);
      } finally {
        setSearchingContent(false);
      }
    };

    fetchContent();
  }, [formData.section_type, contentSearch]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: value ? parseInt(value) : undefined }));
    } else if (name === 'reading_passage' || name === 'listening_part') {
      setFormData((prev) => ({
        ...prev,
        [name]: value ? parseInt(value) : null,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSectionTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as SectionType;
    setFormData((prev) => ({
      ...prev,
      section_type: newType,
      reading_passage: null,
      listening_part: null,
    }));
    setContentSearch('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!formData.book) {
      setError('Book is required');
      return;
    }

    if (formData.section_type === 'READING' && !formData.reading_passage) {
      setError('Reading passage is required for READING section');
      return;
    }

    if (formData.section_type === 'LISTENING' && !formData.listening_part) {
      setError('Listening part is required for LISTENING section');
      return;
    }

    setLoading(true);

    try {
      if (sectionId) {
        await managerAPI.updateSection(sectionId, formData);
        setSuccess('Section updated successfully!');
        setTimeout(() => {
          router.push(`/manager/books/${formData.book}`);
        }, 1500);
      } else {
        await managerAPI.createSection(formData);
        setSuccess('Section created successfully!');
        setTimeout(() => {
          router.push(`/manager/books/${formData.book}`);
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${sectionId ? 'update' : 'create'} section`);
    } finally {
      setLoading(false);
    }
  };

  const isEdit = !!sectionId;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {isEdit ? 'Edit Section' : 'Create New Section'}
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {isEdit ? 'Update section information' : 'Add a new section to the book'}
        </p>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        {/* Section Type */}
        <div className="mb-6">
          <label
            htmlFor="section_type"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Section Type <span className="text-red-500">*</span>
          </label>
          <select
            id="section_type"
            name="section_type"
            value={formData.section_type}
            onChange={handleSectionTypeChange}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="READING">Reading</option>
            <option value="LISTENING">Listening</option>
          </select>
        </div>

        {/* Content Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {formData.section_type === 'READING' ? 'Reading Passage' : 'Listening Part'}{' '}
            <span className="text-red-500">*</span>
          </label>

          {/* Search */}
          <input
            type="text"
            value={contentSearch}
            onChange={(e) => setContentSearch(e.target.value)}
            placeholder={`Search ${formData.section_type === 'READING' ? 'passages' : 'parts'}...`}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white mb-3"
          />

          {/* Content List */}
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-60 overflow-y-auto">
            {searchingContent ? (
              <div className="p-4 text-center">
                <LoadingSpinner size="small" />
              </div>
            ) : availableContent.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No content available
              </div>
            ) : (
              availableContent.map((content) => (
                <label
                  key={content.id}
                  className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                >
                  <input
                    type="radio"
                    name={
                      formData.section_type === 'READING' ? 'reading_passage' : 'listening_part'
                    }
                    value={content.id}
                    checked={
                      formData.section_type === 'READING'
                        ? formData.reading_passage === content.id
                        : formData.listening_part === content.id
                    }
                    onChange={handleChange}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {content.title}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formData.section_type === 'READING'
                        ? `Passage ${content.passage_number} • ${content.word_count} words • ${content.difficulty}`
                        : `Part ${content.part_number} • ${content.duration} min • ${content.difficulty}`}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Title (Optional) */}
        <div className="mb-6">
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Custom Title (optional)
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Leave empty to auto-generate"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            If empty, title will be auto-generated from section order and content
          </p>
        </div>

        {/* Description */}
        <div className="mb-6">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            placeholder="Brief description of this section..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Order, Duration, Lock */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label
              htmlFor="order"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Order
            </label>
            <input
              type="number"
              id="order"
              name="order"
              value={formData.order || ''}
              onChange={handleChange}
              placeholder="Auto"
              min="1"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Leave empty to auto-assign
            </p>
          </div>

          <div>
            <label
              htmlFor="duration_minutes"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Duration (minutes)
            </label>
            <input
              type="number"
              id="duration_minutes"
              name="duration_minutes"
              value={formData.duration_minutes || ''}
              onChange={handleChange}
              placeholder="Optional"
              min="1"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="is_locked"
                checked={formData.is_locked}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                🔒 Locked (requires previous section)
              </span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <LoadingSpinner size="small" />}
            {isEdit ? 'Update Section' : 'Create Section'}
          </button>
        </div>
      </form>
    </div>
  );
}
