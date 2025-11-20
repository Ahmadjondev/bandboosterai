"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { managerAPI } from '@/lib/manager';
import type { Book, BookSection } from '@/types/books';
import type { BookStats } from '@/types/manager/books';
import { LoadingSpinner, Alert, Badge } from '@/components/manager/shared';

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = parseInt(params.id as string);

  const [book, setBook] = useState<Book | null>(null);
  const [sections, setSections] = useState<BookSection[]>([]);
  const [stats, setStats] = useState<BookStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sections' | 'stats'>('sections');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [bookData, sectionsResponse, statsData] = await Promise.all([
        managerAPI.getBook(bookId),
        managerAPI.getSections({ book_id: bookId }),
        managerAPI.getBookStats(bookId),
      ]);

      setBook(bookData);
      setSections(sectionsResponse.sections);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load book data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [bookId]);

  const handleDeleteSection = async (sectionId: number, title: string) => {
    if (!confirm(`Delete section "${title}"?`)) return;

    try {
      await managerAPI.deleteSection(sectionId);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete section');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <Alert type="error" message={error || 'Book not found'} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {/* Cover Image */}
            {book.cover_image && (
              <div className="w-24 h-36 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                <img
                  src={book.cover_image}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {book.title}
              </h1>
              <div className="flex items-center gap-2 mb-2">
                <Badge text={book.level} color="blue" />
                <Badge
                  text={book.is_active ? 'Active' : 'Inactive'}
                  color={book.is_active ? 'green' : 'gray'}
                />
              </div>
              {book.description && (
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
                  {book.description}
                </p>
              )}
              {(book.author || book.publisher || book.publication_year) && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {[book.author, book.publisher, book.publication_year].filter(Boolean).join(' • ')}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/manager/books/${bookId}/edit`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Edit Book
            </button>
            <button
              onClick={() => router.push(`/manager/books/${bookId}/sections`)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Bulk Manage Sections
            </button>
            <button
              onClick={() => router.push('/manager/books')}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Back to Books
            </button>
          </div>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('sections')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'sections'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Sections ({sections.length})
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'stats'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Statistics
          </button>
        </div>
      </div>

      {/* Sections Tab */}
      {activeTab === 'sections' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Book Sections
            </h2>
            <button
              onClick={() => router.push(`/manager/sections/create?book_id=${bookId}`)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              + Add Section
            </button>
          </div>

          {sections.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No sections yet. Add sections to organize the book content.
              </p>
              <button
                onClick={() => router.push(`/manager/sections/create?book_id=${bookId}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add First Section
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                          #{section.order}
                        </span>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {section.title}
                        </h3>
                        <Badge
                          text={section.section_type}
                          color={section.section_type === 'READING' ? 'blue' : 'purple'}
                        />
                        {section.is_locked && <Badge text="🔒 Locked" color="yellow" />}
                      </div>
                      {section.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {section.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>📝 {section.total_questions} questions</span>
                        {section.duration_minutes && (
                          <span>⏱️ {section.duration_minutes} minutes</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/manager/sections/${section.id}/edit`)}
                        className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSection(section.id, section.title)}
                        className="px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          {/* User Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              User Engagement
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.users.total}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Users</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {stats.users.started}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Started</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.users.completed}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Completed</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.users.completion_rate.toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Completion Rate</div>
              </div>
            </div>
          </div>

          {/* Progress Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Overall Progress
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Average Progress
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.progress.average_progress.toFixed(1)}%
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Average Score
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.progress.average_score.toFixed(1)}
                </div>
              </div>
            </div>
          </div>

          {/* Section Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Section Attempts
            </h2>
            <div className="space-y-2">
              {stats.sections.map((section) => (
                <div
                  key={section.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      Section {section.order}: {section.title}
                    </span>
                  </div>
                  <Badge text={`${section.attempts_count} attempts`} color="blue" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
