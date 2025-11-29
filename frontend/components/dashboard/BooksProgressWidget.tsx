"use client";

import Link from "next/link";
import { BookOpen, ChevronRight, Trophy, Clock, Lock, Unlock } from "lucide-react";
import type { DashboardBooksV2, BookProgress } from "@/lib/exam-api";

interface BooksProgressWidgetProps {
  data: DashboardBooksV2 | null;
  loading?: boolean;
}

export default function BooksProgressWidget({ data, loading }: BooksProgressWidgetProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No book data available</p>
        </div>
      </div>
    );
  }

  const { in_progress, suggested, recent_activity, stats } = data;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Practice Books</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {stats.total_started} started · {stats.total_completed} completed
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/books"
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* In Progress Books */}
      {in_progress.length > 0 && (
        <div className="p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Continue Learning
          </h4>
          <div className="space-y-3">
            {in_progress.slice(0, 3).map((book) => (
              <BookProgressCard key={book.id} book={book} />
            ))}
          </div>
        </div>
      )}

      {/* Suggested Books (if no progress) */}
      {in_progress.length === 0 && suggested.length > 0 && (
        <div className="p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Start a New Book
          </h4>
          <div className="space-y-2">
            {suggested.slice(0, 3).map((book) => (
              <Link
                key={book.id}
                href={`/dashboard/books/${book.id}`}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                {book.cover_image ? (
                  <img
                    src={book.cover_image}
                    alt={book.title}
                    className="w-10 h-14 object-cover rounded"
                  />
                ) : (
                  <div className="w-10 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
                    {book.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {book.total_sections} sections · {book.level}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Book Activity */}
      {recent_activity.length > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
            Recent Activity
          </h4>
          <div className="space-y-2">
            {recent_activity.slice(0, 2).map((activity, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  activity.section_type === 'LISTENING' ? 'bg-purple-500' : 'bg-blue-500'
                }`} />
                <span className="text-gray-600 dark:text-gray-400 truncate flex-1">
                  {activity.section_title}
                </span>
                {activity.score && (
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    {activity.score.toFixed(1)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {in_progress.length === 0 && suggested.length === 0 && (
        <div className="p-6 text-center">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No books available yet</p>
          <Link
            href="/dashboard/books"
            className="mt-3 inline-block text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Browse Books
          </Link>
        </div>
      )}
    </div>
  );
}

function BookProgressCard({ book }: { book: BookProgress }) {
  const progressColor = book.percentage >= 100 
    ? 'bg-green-500' 
    : book.percentage >= 50 
    ? 'bg-blue-500' 
    : 'bg-indigo-500';

  return (
    <Link
      href={`/dashboard/books/${book.id}`}
      className="block p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition group"
    >
      <div className="flex items-start gap-3">
        {book.cover_image ? (
          <img
            src={book.cover_image}
            alt={book.title}
            className="w-12 h-16 object-cover rounded shadow-sm"
          />
        ) : (
          <div className="w-12 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded shadow-sm flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
              {book.title}
            </p>
            {book.is_completed && (
              <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {book.completed_sections}/{book.total_sections} sections
            {book.average_score && ` · ${book.average_score.toFixed(1)} avg`}
          </p>
          
          {/* Progress Bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500 dark:text-gray-400">Progress</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{book.percentage}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${progressColor} transition-all duration-300`}
                style={{ width: `${book.percentage}%` }}
              />
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition shrink-0 mt-1" />
      </div>
    </Link>
  );
}
