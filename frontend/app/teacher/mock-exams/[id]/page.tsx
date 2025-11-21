'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, BookOpen, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { teacherMockExamApi } from '@/lib/teacher-api';
import type { MockExamBasic } from '@/types/teacher';

export default function MockExamDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  
  const [mockExam, setMockExam] = useState<MockExamBasic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadMockExam();
    }
  }, [id]);

  const loadMockExam = async () => {
    try {
      setLoading(true);
      const data = await teacherMockExamApi.getMockExam(parseInt(id));
      setMockExam(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load mock exam');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading mock exam...</p>
        </div>
      </div>
    );
  }

  if (error || !mockExam) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 text-lg">{error || 'Mock exam not found'}</p>
          <Link
            href="/teacher/mock-exams"
            className="inline-block mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            Back to Mock Exams
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              href="/teacher/mock-exams"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {mockExam.title}
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Mock Exam Details
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Exam Information
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Title</label>
                  <p className="text-gray-900 dark:text-white mt-1">{mockExam.title}</p>
                </div>

                {mockExam.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Description</label>
                    <p className="text-gray-900 dark:text-white mt-1">{mockExam.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Exam Type</label>
                    <p className="text-gray-900 dark:text-white mt-1">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                        {mockExam.exam_type_display}
                      </span>
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Duration</label>
                    <p className="text-gray-900 dark:text-white mt-1 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      {mockExam.duration_minutes} minutes
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Difficulty</label>
                    <p className="text-gray-900 dark:text-white mt-1">
                      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm">
                        {mockExam.difficulty_level}
                      </span>
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</label>
                    <p className="text-gray-900 dark:text-white mt-1">
                      {mockExam.is_active ? (
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

            {/* Content Details Placeholder */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Exam Content
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Detailed content view (passages, questions, etc.) is under development
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <Link
                  href={`/teacher/exams/create?mock_exam_id=${mockExam.id}`}
                  className="block w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-center font-medium shadow-sm hover:shadow-md"
                >
                  Use in Teacher Exam
                </Link>
                
                {!mockExam.is_active && (
                  <Link
                    href={`/teacher/mock-exams/${mockExam.id}/edit`}
                    className="block w-full px-4 py-3 border-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-center font-medium"
                  >
                    Edit Exam
                  </Link>
                )}
                
                {mockExam.is_active && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                    <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                      Active exams cannot be edited. Contact admin for changes.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Info Notice */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-semibold mb-1">About Mock Exams</p>
                  <p className="text-blue-800 dark:text-blue-200">
                    These are IELTS mock exam templates that you can use when creating teacher exams for your students.
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
