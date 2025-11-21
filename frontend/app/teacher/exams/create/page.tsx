'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, BookOpen, Calendar, Clock, Key, Settings, Sparkles, CheckCircle2 } from 'lucide-react';
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

  const selectedMockExam = mockExams.find(exam => exam.id === formData.mock_exam_id);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              href="/teacher/exams"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Sparkles className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Exam</h1>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Design a custom exam for your students
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mock Exam Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Choose Mock Exam Template
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Select an existing mock exam to base your exam on (optional)
                </p>
              </div>
            </div>

            {loadingMockExams ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading mock exams...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* No Selection Option */}
                <div
                  onClick={() => handleChange('mock_exam_id', undefined)}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    !formData.mock_exam_id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      !formData.mock_exam_id ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {!formData.mock_exam_id && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Create from scratch</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Build a completely custom exam</p>
                    </div>
                  </div>
                </div>

                {/* Mock Exam Options */}
                {mockExams.map((mockExam) => (
                  <div
                    key={mockExam.id}
                    onClick={() => handleChange('mock_exam_id', mockExam.id)}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.mock_exam_id === mockExam.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                        formData.mock_exam_id === mockExam.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {formData.mock_exam_id === mockExam.id && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-gray-900 dark:text-white">{mockExam.title}</p>
                          <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded">
                            {mockExam.exam_type_display}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {mockExam.duration_minutes} min
                          </span>
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                            {mockExam.difficulty_level}
                          </span>
                        </div>
                        {mockExam.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-1">
                            {mockExam.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="h-6 w-6 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Exam Details
              </h2>
            </div>

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
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                  placeholder={selectedMockExam ? selectedMockExam.title : "e.g., IELTS Practice Test 1"}
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
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                  placeholder="Add a description to help students understand what this exam covers..."
                />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="h-6 w-6 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Schedule & Duration
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_date || ''}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
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
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.duration_minutes || (selectedMockExam?.duration_minutes || '')}
                  onChange={(e) => handleChange('duration_minutes', parseInt(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                  placeholder={selectedMockExam ? String(selectedMockExam.duration_minutes) : "120"}
                />
              </div>
            </div>
          </div>

          {/* Access Control */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Key className="h-6 w-6 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Access Control
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={formData.is_public}
                  onChange={(e) => handleChange('is_public', e.target.checked)}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_public" className="ml-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Public Exam</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">All students can access this exam</p>
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
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                  placeholder="e.g., EXAM2024"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Students will need this code to join the exam
                </p>
              </div>
            </div>
          </div>

          {/* Grading Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle2 className="h-6 w-6 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Auto-Grading
              </h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto_grade_reading"
                  checked={formData.auto_grade_reading}
                  onChange={(e) => handleChange('auto_grade_reading', e.target.checked)}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="auto_grade_reading" className="ml-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Auto-grade Reading section</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Automatically calculate reading scores</p>
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto_grade_listening"
                  checked={formData.auto_grade_listening}
                  onChange={(e) => handleChange('auto_grade_listening', e.target.checked)}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="auto_grade_listening" className="ml-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Auto-grade Listening section</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Automatically calculate listening scores</p>
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link
              href="/teacher/exams"
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-lg shadow-blue-500/30"
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
