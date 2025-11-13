'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MotivationStats } from '@/types/books';
import { getMotivationStats } from '@/lib/api/books';

export default function BooksMotivationWidget() {
  const [stats, setStats] = useState<MotivationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getMotivationStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load motivation stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats || stats.total_books === 0) {
    return (
      <div className="bg-linear-to-br from-blue-500 to-purple-600 rounded-xl shadow-sm p-6 text-white border border-blue-400">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold mb-2">Start Your IELTS Journey! 📚</h3>
            <p className="text-white/90 text-sm">
              Begin practicing with our curated IELTS books and track your progress.
            </p>
          </div>
          <svg className="w-12 h-12 text-white/20" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
          </svg>
        </div>
        <Link href="/dashboard/books">
          <button className="w-full bg-white text-blue-600 font-semibold py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-colors shadow-md">
            Browse Books
          </button>
        </Link>
      </div>
    );
  }

  const progressPercentage = stats.total_books > 0
    ? Math.round((stats.completed_books / stats.total_books) * 100)
    : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-linear-to-r from-blue-500 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Your Progress 🎯</h3>
            <p className="text-white/80 text-sm">Keep up the great work!</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {stats.average_score !== null ? stats.average_score.toFixed(1) : '—'}%
            </div>
            <div className="text-white/80 text-xs">Avg Score</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.completed_books}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Books Completed</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.total_sections_completed}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Sections Done</div>
          </div>
        </div>

        {/* Book Completion Progress */}
        {/* {stats.total_books > stats.completed_books && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Books Progress
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {stats.completed_books}/{stats.total_books}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        )} */}

        {/* Current Book Info */}
        {stats.current_book && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Currently Reading</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              {stats.current_book.title}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>Progress</span>
              <span className="font-semibold">
                {stats.current_book.completed_sections}/{stats.current_book.total_sections} sections
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
              <div
                className="bg-blue-600 h-1.5 rounded-full"
                style={{ width: `${stats.current_book.percentage}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Motivational Message */}
        {stats.motivation_message && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {stats.motivation_message}
            </p>
          </div>
        )}

        {/* Action Button */}
        <Link href="/dashboard/books">
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm">
            Continue Practice
          </button>
        </Link>
      </div>
    </div>
  );
}
