'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, 
  Clock, 
  Sparkles, 
  AlertCircle,
  Check,
  X,
  Loader2
} from 'lucide-react';
import { teacherMockExamApi } from '@/lib/teacher-api';
import type { MockExamBasic } from '@/types/teacher';

interface MockExamFormProps {
  mode: 'create' | 'edit';
  examId?: number;
}

type ExamType = 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING' | 'LISTENING_READING' | 'LISTENING_READING_WRITING' | 'FULL_TEST';
type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

const EXAM_TYPE_OPTIONS = [
  { value: 'FULL_TEST', label: 'Full Test', icon: '🎯', description: 'Complete IELTS exam' },
  { value: 'LISTENING_READING_WRITING', label: 'Listening + Reading + Writing', icon: '📚', description: 'Three modules' },
  { value: 'LISTENING_READING', label: 'Listening + Reading', icon: '🎧', description: 'Two modules' },
  { value: 'LISTENING', label: 'Listening Only', icon: '👂', description: 'Listening section' },
  { value: 'READING', label: 'Reading Only', icon: '📖', description: 'Reading section' },
  { value: 'WRITING', label: 'Writing Only', icon: '✍️', description: 'Writing section' },
  { value: 'SPEAKING', label: 'Speaking Only', icon: '💬', description: 'Speaking section' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'BEGINNER', label: 'Beginner', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', band: 'Band 3-4' },
  { value: 'INTERMEDIATE', label: 'Intermediate', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', band: 'Band 5-6' },
  { value: 'ADVANCED', label: 'Advanced', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', band: 'Band 7-8' },
  { value: 'EXPERT', label: 'Expert', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', band: 'Band 8.5-9' },
];

export default function MockExamForm({ mode, examId }: MockExamFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    exam_type: 'FULL_TEST' as ExamType,
    difficulty_level: 'INTERMEDIATE' as DifficultyLevel,
    duration_minutes: 164, // Default full test duration
  });

  useEffect(() => {
    if (mode === 'edit' && examId) {
      loadExamData();
    }
  }, [mode, examId]);

  const loadExamData = async () => {
    if (!examId) return;
    setLoading(true);
    try {
      const data = await teacherMockExamApi.getMockExam(examId);
      setFormData({
        title: data.title,
        description: data.description || '',
        exam_type: data.exam_type as ExamType,
        difficulty_level: data.difficulty_level as DifficultyLevel,
        duration_minutes: data.duration_minutes,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load exam data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      if (mode === 'edit' && examId) {
        await teacherMockExamApi.updateMockExam(examId, formData);
        setSuccess('Mock exam updated successfully!');
        setTimeout(() => router.push(`/teacher/mock-exams/${examId}`), 1500);
      } else {
        const response = await teacherMockExamApi.createMockExam(formData);
        setSuccess('Mock exam created successfully! Pending admin review.');
        setTimeout(() => router.push('/teacher/mock-exams'), 1500);
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${mode === 'edit' ? 'update' : 'create'} mock exam`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading exam data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header with gradient */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
          <BookOpen className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {mode === 'edit' ? 'Edit Mock Exam' : 'Create New Mock Exam'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {mode === 'edit' ? 'Update your mock exam details' : 'Design a new IELTS mock exam for your students'}
        </p>
      </div>

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-900 dark:text-blue-100">
          <p className="font-semibold mb-1">📋 Note About Mock Exam Creation</p>
          <p className="text-blue-800 dark:text-blue-200">
            Mock exams you create will be set as <strong>inactive</strong> and require admin review before they can be used. 
            You'll be notified once your exam is approved!
          </p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
          <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
          <p className="text-green-900 dark:text-green-100 font-medium">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <X className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-red-900 dark:text-red-100 font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Basic Information
            </h2>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Exam Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="e.g., IELTS Academic Full Test - October 2024"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder="Provide a brief description of this mock exam, its purpose, and any special instructions..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all resize-none"
              />
            </div>

            {/* Duration */}
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Duration (minutes) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  id="duration"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                  required
                  min="1"
                  placeholder="164"
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Standard: Listening (30), Reading (60), Writing (60), Speaking (14)
              </p>
            </div>
          </div>
        </div>

        {/* Exam Type Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Exam Type <span className="text-red-500">*</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {EXAM_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData({ ...formData, exam_type: option.value as ExamType })}
                className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                  formData.exam_type === option.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{option.icon}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white mb-1">
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {option.description}
                    </div>
                  </div>
                  {formData.exam_type === option.value && (
                    <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty Level */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Difficulty Level <span className="text-red-500">*</span>
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DIFFICULTY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData({ ...formData, difficulty_level: option.value as DifficultyLevel })}
                className={`relative p-4 rounded-xl border-2 text-center transition-all ${
                  formData.difficulty_level === option.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm scale-105'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                <div className="space-y-2">
                  <div className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${option.color}`}>
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {option.band}
                  </div>
                  {formData.difficulty_level === option.value && (
                    <Check className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={saving}
            className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {mode === 'edit' ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Check className="h-5 w-5" />
                {mode === 'edit' ? 'Update Exam' : 'Create Exam'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
