'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/DashboardLayout';
import VerificationGuard from '@/components/VerificationGuard';
import { Book } from '@/types/books';
import { getBooks, calculateProgress, getLevelBadgeColor } from '@/lib/api/books';
import { Button } from '@/components/Button';
import { BookOpen, Filter } from 'lucide-react';

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('');

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBooks();
      setBooks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = filterLevel
    ? books.filter((book) => book.level === filterLevel)
    : books;

  const levels = ['B1', 'B2', 'C1', 'C2'];
  const totalBooks = books.length;
  const completedBooks = books.filter((b) => b.user_progress?.is_completed).length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading books...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">Error loading books</h3>
            <p className="text-red-600 dark:text-red-300">{error}</p>
            <Button onClick={loadBooks} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <VerificationGuard>
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              IELTS Practice Books
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Choose a book and start practicing. Track your progress through each section.
            </p>
          </div>
        </div>

        {/* Stats Bar */}
        {totalBooks > 0 && (
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Books: </span>
              <span className="font-semibold text-gray-900 dark:text-white">{totalBooks}</span>
            </div>
            <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Completed: </span>
              <span className="font-semibold text-green-600 dark:text-green-400">{completedBooks}</span>
            </div>
            <div className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">In Progress: </span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                {books.filter((b) => b.user_progress?.is_started && !b.user_progress?.is_completed).length}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Level:</span>
          <button
            onClick={() => setFilterLevel('')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterLevel === ''
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All
          </button>
          {levels.map((level) => (
            <button
              key={level}
              onClick={() => setFilterLevel(level)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterLevel === level
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Books List */}
      {filteredBooks.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            {filterLevel ? `No ${filterLevel} level books available yet.` : 'No books available yet. Check back later!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
      </div>
    </DashboardLayout>
    </VerificationGuard>
  );
}

interface BookCardProps {
  book: Book;
}

function BookCard({ book }: BookCardProps) {
  const progress = book.user_progress;
  const progressPercentage = progress
    ? calculateProgress(progress.completed_sections, progress.total_sections)
    : 0;

  const getProgressColor = (percentage: number): string => {
    if (percentage === 100) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <Link href={`/dashboard/books/${book.id}`}>
      <div className="group bg-white dark:bg-gray-800 rounded-lg border mb-4 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200 hover:shadow-md">
        <div className="p-4 flex items-center gap-4">
          {/* Book Icon */}
          <div className="shrink-0 w-12 h-12 rounded-lg bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>

          {/* Book Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                  {book.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {book.author || 'IELTS Practice Book'}
                </p>
              </div>
              
              {/* Level Badge */}
              <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelBadgeColor(book.level)}`}>
                {book.level}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${getProgressColor(progressPercentage)}`}
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Stats */}
              <div className="shrink-0 flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                <span>
                  {progress ? `${progress.completed_sections}/${progress.total_sections}` : `0/${book.total_sections}`} sections
                </span>
                {progress && progress.average_score !== null && progress.average_score > 0 && (
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    {progress.average_score.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status Icon */}
          <div className="shrink-0">
            {progress?.is_completed ? (
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            ) : (
              <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
