/**
 * Passage Form Component
 * Simple form for creating and editing reading passages
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getReadingPassage, createReadingPassage, updateReadingPassage } from '@/lib/api/reading';
import type { PassageNumber } from '@/types/reading';
import { LoadingSpinner } from '@/components/manager/shared';

interface PassageFormProps {
  mode?: 'create' | 'edit';
  id?: number;
}

interface PassageFormData {
  passage_number: PassageNumber;
  title: string;
  content: string;
}

export function PassageForm({ mode = 'create', id }: PassageFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PassageFormData>({
    passage_number: 1,
    title: '',
    content: '',
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const isEditMode = mode === 'edit' && !!id;
  const pageTitle = isEditMode ? 'Edit Passage' : 'New Passage';

  const wordCount = useMemo(() => {
    if (!form.content) return 0;
    return form.content
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }, [form.content]);

  const canSubmit = form.passage_number && form.title && form.content;

  useEffect(() => {
    if (isEditMode && id) {
      loadPassage();
    }
  }, [isEditMode, id]);

  const loadPassage = async () => {
    setLoading(true);
    try {
      const response = await getReadingPassage(id!);
      const passage = response.passage;
      setForm({
        passage_number: passage.passage_number,
        title: passage.title || '',
        content: passage.content || '',
      });
    } catch (error) {
      console.error('Error loading passage:', error);
      alert('Failed to load passage');
      router.push('/manager/reading');
    } finally {
      setLoading(false);
    }
  };

  const savePassage = async () => {
    if (!canSubmit || saving) return;

    setSaving(true);
    setErrors({});

    try {
      if (isEditMode) {
        await updateReadingPassage(id!, form);
        alert('Passage updated successfully');
      } else {
        await createReadingPassage(form);
        alert('Passage created successfully');
      }

      router.push('/manager/reading');
    } catch (error: any) {
      console.error('Error saving passage:', error);
      if (error.response && error.response.data) {
        setErrors(error.response.data);
      }
      alert('Failed to save passage: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    router.push('/manager/reading');
  };

  const getFieldError = (field: string) => {
    return errors[field] ? errors[field][0] : null;
  };

  const hasError = (field: string) => {
    return !!errors[field];
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={cancel} className="text-slate-600 hover:text-slate-900 dark:text-gray-200 dark:hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{pageTitle}</h1>
          </div>

          <button
            onClick={savePassage}
            disabled={saving || !canSubmit}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-orange-500 dark:hover:bg-orange-600"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="space-y-6">
          {/* Passage Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Passage Number <span className="text-rose-600">*</span>
            </label>
            <select
              value={form.passage_number}
              onChange={(e) =>
                setForm({ ...form, passage_number: parseInt(e.target.value) as PassageNumber })
              }
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                hasError('passage_number') ? 'border-rose-300' : 'border-slate-300'
              } dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100`}
            >
              <option value={1}>Passage 1</option>
              <option value={2}>Passage 2</option>
              <option value={3}>Passage 3</option>
            </select>
            {hasError('passage_number') && (
              <p className="mt-1 text-sm text-rose-600">{getFieldError('passage_number')}</p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Title <span className="text-rose-600">*</span>
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              type="text"
              placeholder="Enter passage title"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                hasError('title') ? 'border-rose-300' : 'border-slate-300'
              } dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100`}
            />
            {hasError('title') && (
              <p className="mt-1 text-sm text-rose-600">{getFieldError('title')}</p>
            )}
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Content <span className="text-rose-600">*</span>
              </label>
              <span className="text-xs text-slate-500">{wordCount} words</span>
            </div>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={18}
              placeholder="Enter passage content..."
              className={`w-full px-3 py-2 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                hasError('content') ? 'border-rose-300' : 'border-slate-300'
              } dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100`}
            />
            {hasError('content') && (
              <p className="mt-1 text-sm text-rose-600">{getFieldError('content')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
