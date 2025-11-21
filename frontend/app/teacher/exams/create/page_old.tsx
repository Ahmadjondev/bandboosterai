'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, BookOpen, Calendar, Clock, Key, Settings, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { teacherExamApi } from '@/lib/teacher-api';
import type { CreateExamData, MockExamBasic } from '@/types/teacher';

export default function CreateExamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingMockExams, setLoadingMockExams] = useState(true);
  const [mockExams, setMockExams] = useState<MockExamBasic[]>([]);
  const [formData, setFormData] = useState<CreateExamData>({
    title: '',
    description: '',
    mock_exam_id: undefined,
    is_public: false,
    auto_grade_reading: true,
    auto_grade_listening: true,
  });

  useEffect(() => {
    loadMockExams();
  }, []);

  const loadMockExams = async () => {
    try {
      setLoadingMockExams(true);
      const data = await teacherExamApi.getAvailableMockExams();
      setMockExams(data);
    } catch (error) {
      console.error('Failed to load mock exams:', error);
    } finally {
      setLoadingMockExams(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await teacherExamApi.createExam(formData);
      router.push('/teacher/exams');
    } catch (error: any) {
      console.error('Failed to create exam:', error);
      alert(error.message || 'Failed to create exam');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateExamData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              href="/teacher/exams"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Exam</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Set up a new exam for your students
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Basic Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Exam Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., IELTS Practice Test 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Add a description for your students..."
                  />
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Schedule
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_date || ''}
                    onChange={(e) => handleChange('start_date', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_date || ''}
                    onChange={(e) => handleChange('end_date', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.duration_minutes || ''}
                    onChange={(e) => handleChange('duration_minutes', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="120"
                  />
                </div>
              </div>
            </div>

            {/* Access Control */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Access Control
              </h2>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={formData.is_public}
                    onChange={(e) => handleChange('is_public', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_public" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Make this exam public (all students can access)
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Access Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.access_code || ''}
                    onChange={(e) => handleChange('access_code', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter access code"
                  />
                </div>
              </div>
            </div>

            {/* Grading Settings */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Grading Settings
              </h2>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="auto_grade_reading"
                    checked={formData.auto_grade_reading}
                    onChange={(e) => handleChange('auto_grade_reading', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="auto_grade_reading" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Automatically grade Reading section
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="auto_grade_listening"
                    checked={formData.auto_grade_listening}
                    onChange={(e) => handleChange('auto_grade_listening', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="auto_grade_listening" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Automatically grade Listening section
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex justify-end gap-4">
            <Link
              href="/teacher/exams"
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-5 w-5" />
              {loading ? 'Creating...' : 'Create Exam'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
