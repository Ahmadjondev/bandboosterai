'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, Eye, User, Calendar } from 'lucide-react';
import { teacherDashboardApi } from '@/lib/teacher-api';
import type { TeacherExamAttempt } from '@/types/teacher';

export default function GradingPage() {
  const [attempts, setAttempts] = useState<TeacherExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingGrades();
  }, []);

  const loadPendingGrades = async () => {
    try {
      setLoading(true);
      const data = await teacherDashboardApi.getPendingGrades();
      setAttempts(data);
    } catch (error) {
      console.error('Failed to load pending grades:', error);
    } finally {
      setLoading(false);
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
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pending Grading</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {attempts.length} {attempts.length === 1 ? 'attempt' : 'attempts'} waiting for your review
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {attempts.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Exam
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {attempts.map((attempt) => (
                    <tr key={attempt.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="shrink-0 h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {attempt.student.full_name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {attempt.student.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {attempt.exam.title}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {attempt.exam.status}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {attempt.submitted_at ? (
                          <div className="flex items-center justify-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {new Date(attempt.submitted_at).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {attempt.duration_minutes ? `${attempt.duration_minutes} min` : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Link
                          href={`/teacher/attempts/${attempt.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          Grade Now
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <ClipboardCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              All caught up!
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              There are no attempts waiting for grading at the moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
