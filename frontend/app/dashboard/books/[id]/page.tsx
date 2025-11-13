'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BookDetailResponse, BookSection } from '@/types/books';
import {
  getBookDetail,
  getBookSections,
  calculateProgress,
  getLevelBadgeColor,
  getSectionStatusIcon,
  getSectionStatusText,
} from '@/lib/api/books';
import { Button } from '@/components/Button';

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = parseInt(params.id as string);

  const [book, setBook] = useState<BookDetailResponse | null>(null);
  const [sections, setSections] = useState<BookSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bookId) {
      loadBookData();
    }
  }, [bookId]);

  const loadBookData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch book details and sections in parallel
      const [bookData, sectionsData] = await Promise.all([
        getBookDetail(bookId),
        getBookSections(bookId),
      ]);
      
      setBook(bookData);
      setSections(sectionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load book data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading book details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !book) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">Error loading book</h3>
            <p className="text-red-600 dark:text-red-300">{error || 'Book not found'}</p>
            <div className="flex gap-2 mt-4">
              <Button onClick={loadBookData}>Try Again</Button>
              <Button variant="secondary" onClick={() => router.push('/dashboard/books')}>
                Back to Books
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const progress = book.user_progress;
  const progressPercentage = progress
    ? calculateProgress(progress.completed_sections, progress.total_sections)
    : 0;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
      {/* Back Button */}
      <Link
        href="/dashboard/books"
        className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors mb-6 font-medium"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Books
      </Link>

      {/* Book Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-6">
        <div className="flex flex-col md:flex-row gap-6 p-6">
          {/* Book Cover */}
          <div className="shrink-0 mx-auto md:mx-0">
            <div className="w-48 h-64 rounded-xl overflow-hidden bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              {book.cover_image ? (
                <img src={book.cover_image} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <svg className="w-20 h-20 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              )}
            </div>
          </div>

          {/* Book Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {book.title}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {book.description || 'IELTS practice book'}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getLevelBadgeColor(book.level)}`}>
                {book.level}
              </span>
            </div>

            {/* Progress Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Sections</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{book.total_sections}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Completed</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {progress?.completed_sections || 0}
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Progress</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{progressPercentage}%</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg Score</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {progress?.average_score?.toFixed(1) || '—'}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {progress?.is_completed ? 'Book Completed! 🎉' : 'Overall Progress'}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {progress?.completed_sections || 0} of {book.total_sections} sections
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    progressPercentage === 100
                      ? 'bg-green-600'
                      : progressPercentage >= 50
                      ? 'bg-yellow-500'
                      : 'bg-gray-400'
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sections List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          Sections
        </h2>

        {sections.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No sections available in this book yet.
          </p>
        ) : (
          <div className="space-y-3">
            {sections.map((section) => (
              <SectionItem key={section.id} section={section} bookId={book.id} />
            ))}
          </div>
        )}
      </div>
      </div>
    </DashboardLayout>
  );
}

interface SectionItemProps {
  section: BookSection;
  bookId: number;
}

function SectionItem({ section, bookId }: SectionItemProps) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  
  // Determine if section is truly locked (is_locked flag AND not accessible)
  const isLocked = section.is_locked && !section.user_status?.is_accessible;
  const isCompleted = section.user_status?.completed || false;
  
  const statusIcon = getSectionStatusIcon(
    isCompleted,
    isLocked
  );
  const statusText = getSectionStatusText(
    isCompleted,
    isLocked,
    section.user_status?.score
  );

  const sectionTitle =
    section.section_type === 'READING'
      ? section.reading_passage?.title || 'Reading Section'
      : section.listening_part?.title || 'Listening Section';

  const handleStartSection = async () => {
    if (isLocked || starting) return;
    
    try {
      setStarting(true);
      
      // Route to dedicated practice pages based on section type
      const practiceRoute = section.section_type === 'READING' 
        ? `/dashboard/practice/reading/${section.id}`
        : `/dashboard/practice/listening/${section.id}`;
      
      router.push(practiceRoute);
    } catch (err) {
      console.error('Error starting section:', err);
      alert(err instanceof Error ? err.message : 'Failed to start section');
      setStarting(false);
    }
  };

  return (
    <div
      className={`group border-2 rounded-xl p-4 transition-all duration-300 ${
        isLocked
          ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg cursor-pointer'
      }`}
      // onClick={handleStartSection}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Status Icon */}
          <div className="shrink-0">
            <span className="text-4xl">{statusIcon}</span>
          </div>

          {/* Section Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Section {section.order}
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                section.section_type === 'READING'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                  : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
              }`}>
                {section.section_type}
              </span>
              {isCompleted && (
                <span className="px-2.5 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs font-bold">
                  Completed
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate">
              {sectionTitle}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{statusText}</p>
          </div>

          {/* Attempt Count & Score */}
          {section.user_status && section.user_status.attempt_count > 0 && (
            <div className="hidden md:block text-right shrink-0">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {section.user_status.attempt_count} {section.user_status.attempt_count === 1 ? 'attempt' : 'attempts'}
                </p>
                {section.user_status.score !== null && (
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {section.user_status.score.toFixed(1)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="shrink-0">
          {!isLocked ? (
            <Button
              variant={isCompleted ? 'secondary' : 'primary'}
              onClick={(e) => {
                e.stopPropagation();
                handleStartSection();
              }}
              disabled={starting}
              className="whitespace-nowrap"
            >
              {starting ? 'Starting...' : (isCompleted ? 'Practice Again' : 'Start')}
            </Button>
          ) : (
            <div className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 text-sm font-medium">
              Locked
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
