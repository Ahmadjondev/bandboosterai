'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { managerAPI } from '@/lib/manager';
import type { BookWithStats, BooksFilters, IELTSLevel } from '@/types/manager/books';
import { LoadingSpinner, EmptyState, Alert, Badge, Pagination } from '@/components/manager/shared';

export default function BooksPage() {
  const router = useRouter();
  const [books, setBooks] = useState<BookWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BooksFilters>({
    page: 1,
    sort: '-created_at',
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    has_next: false,
    has_previous: false,
  });

  const levels: Array<{ value: IELTSLevel; label: string }> = [
    { value: 'B1', label: 'B1 - Intermediate' },
    { value: 'B2', label: 'B2 - Upper Intermediate' },
    { value: 'C1', label: 'C1 - Advanced' },
    { value: 'C2', label: 'C2 - Proficient' },
  ];

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await managerAPI.getBooks(filters);
      setBooks(response.books);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [filters]);

  const handleToggleStatus = async (bookId: number) => {
    try {
      await managerAPI.toggleBookStatus(bookId);
      fetchBooks();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle book status');
    }
  };

  const handleDelete = async (bookId: number, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await managerAPI.deleteBook(bookId);
      fetchBooks();
    } catch (err: any) {
      setError(err.message || 'Failed to delete book');
    }
  };

  const handleFilterChange = (key: keyof BooksFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === '' ? undefined : value,
      page: key !== 'page' ? 1 : value, // Reset to page 1 when changing filters
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Books</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Manage IELTS practice books and their sections
            </p>
          </div>
          <button
            onClick={() => router.push('/manager/books/create')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Book
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6">
          <Alert type="error" message={error} />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search books..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Level
            </label>
            <select
              value={filters.level || ''}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Levels</option>
              {levels.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={filters.is_active === undefined ? '' : filters.is_active.toString()}
              onChange={(e) =>
                handleFilterChange('is_active', e.target.value === '' ? undefined : e.target.value === 'true')
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Premium
            </label>
            <select
              value={filters.is_premium === undefined ? '' : filters.is_premium.toString()}
              onChange={(e) =>
                handleFilterChange('is_premium', e.target.value === '' ? undefined : e.target.value === 'true')
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All</option>
              <option value="true">Premium Only</option>
              <option value="false">Free Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sort By
            </label>
            <select
              value={filters.sort || '-created_at'}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="-created_at">Newest First</option>
              <option value="created_at">Oldest First</option>
              <option value="title">Title A-Z</option>
              <option value="-title">Title Z-A</option>
              <option value="level">Level</option>
            </select>
          </div>
        </div>
      </div>

      {/* Books List */}
      {loading ? (
        <LoadingSpinner size="large" />
      ) : books.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
          <EmptyState
            title="No books found"
            description="Create your first book to get started"
          />
          <button
            onClick={() => router.push('/manager/books/create')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Book
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
            {books.map((book) => (
              <div
                key={book.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Cover Image */}
                <div className="h-48 bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  {book.cover_image ? (
                    <img
                      src={book.cover_image}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-white text-6xl font-bold opacity-50">
                      {book.title.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {book.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge text={book.level} color="blue" />
                        <Badge
                          text={book.is_active ? 'Active' : 'Inactive'}
                          color={book.is_active ? 'green' : 'gray'}
                        />
                        {book.is_premium && (
                          <Badge text="Premium" color="yellow" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {book.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {book.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {book.total_sections}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Sections</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {book.enrolled_count}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Users</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {book.average_progress.toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Progress</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/manager/books/${book.id}`)}
                      className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => router.push(`/manager/books/${book.id}/edit`)}
                      className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(book.id)}
                      className="px-3 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                      title={book.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {book.is_active ? '🔒' : '🔓'}
                    </button>
                    <button
                      onClick={() => handleDelete(book.id, book.title)}
                      className="px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={pagination.current_page}
            totalPages={pagination.total_pages}
            hasNext={pagination.has_next}
            hasPrevious={pagination.has_previous}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}
