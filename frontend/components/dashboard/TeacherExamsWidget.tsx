'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Trophy, Clock, ArrowRight } from 'lucide-react';
import { studentTeacherExamApi } from '@/lib/student-teacher-api';
import type { TeacherExam } from '@/types/teacher';

export default function TeacherExamsWidget() {
  const [exams, setExams] = useState<TeacherExam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      const data = await studentTeacherExamApi.getMyExams();
      setExams(data.slice(0, 3)); // Show only top 3
    } catch (error: any) {
      console.error('Failed to load teacher exams:', error);
      console.error('Error details:', error?.message, error?.response);
      // Don't fail silently, just show empty state
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Teacher Exams
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Exams assigned by your teachers
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/teacher-exams"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm font-medium flex items-center gap-1"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {exams.length > 0 ? (
          <div className="space-y-4">
            {exams.map((exam) => (
              <Link
                key={exam.id}
                href={`/dashboard/teacher-exams/${exam.id}`}
                className="block p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {exam.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      by {exam.teacher.full_name}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      {exam.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {exam.duration_minutes} min
                        </span>
                      )}
                      {exam.is_public ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded">
                          Public
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                          Private
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 shrink-0 ml-2" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
              No exams available yet
            </p>
            <Link
              href="/dashboard/teacher-exams"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Trophy className="h-4 w-4" />
              Browse Exams
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
