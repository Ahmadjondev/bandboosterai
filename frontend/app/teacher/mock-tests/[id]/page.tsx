'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, BookOpen, CheckCircle2, AlertCircle, Edit as EditIcon } from 'lucide-react';
import { teacherMockExamApi } from '@/lib/teacher-api';
import type { MockExamBasic } from '@/types/teacher';

export default function MockTestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  
  const [mockTest, setMockTest] = useState<MockExamBasic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadMockTest();
    }
  }, [id]);

  const loadMockTest = async () => {
    try {
      setLoading(true);
      const data = await teacherMockExamApi.getMockExam(parseInt(id));
      setMockTest(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load mock test');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading mock test...</p>
        </div>
      </div>
    );
  }

  if (error || !mockTest) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 text-lg mb-4">{error || 'Mock test not found'}</p>
          <Link
            href="/teacher/mock-tests"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Mock Tests
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/teacher/mock-tests"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Mock Tests
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {mockTest.title}
              </h1>
              
              {mockTest.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {mockTest.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Exam Type</label>
                  <p className="text-gray-900 dark:text-white mt-1">
                    <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                      {mockTest.exam_type_display}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Duration</label>
                  <p className="text-gray-900 dark:text-white mt-1 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    {mockTest.duration_minutes} minutes
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Difficulty</label>
                  <p className="text-gray-900 dark:text-white mt-1">
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm">
                      {mockTest.difficulty_level}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</label>
                  <p className="text-gray-900 dark:text-white mt-1">
                    {mockTest.is_active ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-orange-600">
                        <Clock className="h-4 w-4" />
                        Pending Review
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <Link
                  href={`/teacher/exams/create?mock_exam_id=${mockTest.id}`}
                  className="block w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center font-medium"
                >
                  Use in Teacher Exam
                </Link>
                
                {!mockTest.is_active && (
                  <Link
                    href={`/teacher/mock-tests/${mockTest.id}/edit`}
                    className="block w-full px-4 py-3 border-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-center font-medium"
                  >
                    <EditIcon className="inline h-4 w-4 mr-2" />
                    Edit Test
                  </Link>
                )}
                
                {mockTest.is_active && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                      Active tests cannot be edited. Contact admin for changes.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-semibold mb-1">About Mock Tests</p>
                  <p className="text-blue-800 dark:text-blue-200">
                    These are IELTS mock test templates that you can use when creating teacher exams for your students.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
