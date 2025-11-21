'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, BookOpen, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { teacherExamApi, teacherMockExamApi } from '@/lib/teacher-api';
import type { UpdateExamData, MockExamBasic } from '@/types/teacher';

export default function EditExamPage() {
  const router = useRouter();
  const params = useParams();
  const examId = parseInt(params.id as string);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingMockExams, setLoadingMockExams] = useState(true);
  const [mockExams, setMockExams] = useState<MockExamBasic[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<UpdateExamData>({
    title: '',
    description: '',
    mock_exam_id: undefined,
    is_public: false,
    auto_grade_reading: true,
    auto_grade_listening: true,
  });

  useEffect(() => {
    loadExamData();
    loadMockExams();
  }, [examId]);

  const loadExamData = async () => {
    try {
      setLoading(true);
      const exam = await teacherExamApi.getExam(examId);
      setFormData({
        title: exam.title,
        description: exam.description || '',
        mock_exam_id: exam.mock_exam?.id,
        is_public: exam.is_public,
        auto_grade_reading: exam.auto_grade_reading,
        auto_grade_listening: exam.auto_grade_listening,
      });
    } catch (err) {
      console.error('Failed to load exam:', err);
      setError('Failed to load exam data');
    } finally {
      setLoading(false);
    }
  };

  const loadMockExams = async () => {
    try {
      setLoadingMockExams(true);
      const data = await teacherMockExamApi.getMockExams();
      setMockExams(data);
    } catch (err) {
      console.error('Failed to load mock exams:', err);
    } finally {
      setLoadingMockExams(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title?.trim()) {
      setError('Title is required');
      return;
    }

    if (!formData.mock_exam_id) {
      setError('Please select a mock test template');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await teacherExamApi.updateExam(examId, formData);
      router.push('/teacher/exams');
    } catch (err: any) {
      console.error('Failed to update exam:', err);
      setError(err.message || 'Failed to update exam');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/teacher/exams"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Back to Exams</span>
          </Link>
          <div className="mt-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Exam</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Update exam details and settings
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Basic Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter exam title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                  placeholder="Enter exam description (optional)"
                />
              </div>
            </div>
          </div>

          {/* Mock Test Template */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Mock Test Template
              </h2>
            </div>
            
            {loadingMockExams ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : mockExams.length > 0 ? (
              <div className="space-y-3">
                {mockExams.map((mockExam) => (
                  <label
                    key={mockExam.id}
                    className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.mock_exam_id === mockExam.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mock_exam"
                      value={mockExam.id}
                      checked={formData.mock_exam_id === mockExam.id}
                      onChange={() => setFormData({ ...formData, mock_exam_id: mockExam.id })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {mockExam.title}
                      </div>
                      {mockExam.description && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {mockExam.description}
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                          {mockExam.exam_type}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                          {mockExam.difficulty_level}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                <p>No mock tests available. Create a mock test first.</p>
                <Link
                  href="/teacher/mock-tests/create"
                  className="inline-block mt-4 text-blue-600 hover:text-blue-700"
                >
                  Create Mock Test
                </Link>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Settings
            </h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.is_public}
                  onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Public Exam</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Make this exam available to all students
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.auto_grade_reading}
                  onChange={(e) => setFormData({ ...formData, auto_grade_reading: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Auto-grade Reading</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Automatically grade reading section
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.auto_grade_listening}
                  onChange={(e) => setFormData({ ...formData, auto_grade_listening: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Auto-grade Listening</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Automatically grade listening section
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4">
            <Link
              href="/teacher/exams"
              className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
