'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Book } from '@/types/books';
import { getBooks, calculateProgress, getLevelBadgeColor } from '@/lib/api/books';
import { Button } from '@/components/Button';
import { BookOpen, Filter, Search, Grid3x3, List, TrendingUp, Award, Clock, Star, ChevronRight, Sparkles, ArrowUpDown } from 'lucide-react';

type ViewMode = 'grid' | 'list';
type SortOption = 'recent' | 'progress' | 'title' | 'level';

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

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

  // Enhanced filtering and sorting with useMemo
  const filteredAndSortedBooks = useMemo(() => {
    let result = [...books];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (book) =>
          book.title.toLowerCase().includes(query) ||
          book.author?.toLowerCase().includes(query) ||
          book.level.toLowerCase().includes(query)
      );
    }

    // Level filter
    if (filterLevel) {
      result = result.filter((book) => book.level === filterLevel);
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'level':
          return a.level.localeCompare(b.level);
        case 'progress':
          const progressA = a.user_progress
            ? calculateProgress(a.user_progress.completed_sections, a.user_progress.total_sections)
            : 0;
          const progressB = b.user_progress
            ? calculateProgress(b.user_progress.completed_sections, b.user_progress.total_sections)
            : 0;
          return progressB - progressA;
        case 'recent':
        default:
          return b.id - a.id;
      }
    });

    return result;
  }, [books, searchQuery, filterLevel, sortBy]);

  const levels = ['B1', 'B2', 'C1', 'C2'];
  const totalBooks = books.length;
  const completedBooks = books.filter((b) => b.user_progress?.is_completed).length;
  const inProgressBooks = books.filter((b) => b.user_progress?.is_started && !b.user_progress?.is_completed).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">Loading your library...</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Preparing your practice books</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">Error loading books</h3>
            <p className="text-red-600 dark:text-red-300 mb-6">{error}</p>
            <Button onClick={loadBooks} className="bg-red-600 hover:bg-red-700">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Header */}
        <div className="mb-8 relative overflow-hidden rounded-2xl bg-linear-to-br from-blue-600 via-purple-600 to-pink-600 p-8 text-white shadow-xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl w-fit">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  IELTS Practice Library
                </h1>
                <p className="text-blue-100 text-sm md:text-base">
                  Master IELTS with comprehensive practice books. Track your progress and achieve your target score.
                </p>
              </div>
            </div>

            {/* Enhanced Stats Cards */}
            {totalBooks > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-blue-200" />
                    <span className="text-xs text-blue-200 font-medium">Total Books</span>
                  </div>
                  <div className="text-3xl font-bold">{totalBooks}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-green-200" />
                    <span className="text-xs text-green-200 font-medium">Completed</span>
                  </div>
                  <div className="text-3xl font-bold">{completedBooks}</div>
                  {totalBooks > 0 && (
                    <div className="text-xs text-blue-200 mt-1 font-medium">
                      {Math.round((completedBooks / totalBooks) * 100)}% done
                    </div>
                  )}
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-purple-200" />
                    <span className="text-xs text-purple-200 font-medium">In Progress</span>
                  </div>
                  <div className="text-3xl font-bold">{inProgressBooks}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-yellow-200" />
                    <span className="text-xs text-yellow-200 font-medium">Available</span>
                  </div>
                  <div className="text-3xl font-bold">{totalBooks - completedBooks - inProgressBooks}</div>
                </div>
              </div>
            )}
          </div>
          {/* Decorative elements */}
          <div className="absolute -right-8 -bottom-8 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute -left-8 top-0 w-48 h-48 bg-purple-400/10 rounded-full blur-2xl"></div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search books by title, author, or level..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Level Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <button
                onClick={() => setFilterLevel('')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterLevel === ''
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                All
              </button>
              {levels.map((level) => (
                <button
                  key={level}
                  onClick={() => setFilterLevel(level)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filterLevel === level
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Sort and View Options */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="recent">Recently Added</option>
                <option value="title">Title (A-Z)</option>
                <option value="level">Level</option>
                <option value="progress">Progress</option>
              </select>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-700 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-600 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                title="Grid view"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-600 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results count */}
        {filteredAndSortedBooks.length > 0 && (
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredAndSortedBooks.length}</span> {filteredAndSortedBooks.length === 1 ? 'book' : 'books'}
            {(searchQuery || filterLevel) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterLevel('');
                }}
                className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Books List */}
        {filteredAndSortedBooks.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <BookOpen className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No books found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchQuery || filterLevel
                ? "Try adjusting your search or filters"
                : 'No books available yet. Check back later!'}
            </p>
            {(searchQuery || filterLevel) && (
              <Button
                onClick={() => {
                  setSearchQuery('');
                  setFilterLevel('');
                }}
                className="mx-auto"
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {filteredAndSortedBooks.map((book) => (
              <BookCard key={book.id} book={book} viewMode={viewMode} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface BookCardProps {
  book: Book;
  viewMode: ViewMode;
}

function BookCard({ book, viewMode }: BookCardProps) {
  const progress = book.user_progress;
  const progressPercentage = progress
    ? calculateProgress(progress.completed_sections, progress.total_sections)
    : 0;

  const getProgressColor = (percentage: number): string => {
    if (percentage === 100) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getProgressGradient = (percentage: number): string => {
    if (percentage === 100) return 'from-green-500 to-emerald-600';
    if (percentage >= 50) return 'from-yellow-500 to-orange-500';
    return 'from-blue-500 to-purple-600';
  };

  if (viewMode === 'list') {
    console.log(book);
    return (
      <Link href={`/dashboard/books/${book.id}`} className="block group">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 overflow-hidden">
          <div className="p-5 flex items-center gap-5">
            {/* Book Icon */}
            <div className={`shrink-0 w-16 h-16 rounded-xl bg-linear-to-br ${getProgressGradient(progressPercentage)} flex items-center justify-center shadow-lg`}>
              <BookOpen className="w-8 h-8 text-white" />
            </div>

            {/* Book Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate mb-1">
                    {book.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {book.author || 'IELTS Practice Book'}
                  </p>
                </div>
                
                {/* Level Badge */}
                <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${getLevelBadgeColor(book.level)}`}>
                  {book.level}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${getProgressColor(progressPercentage)}`}
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Stats */}
                <div className="shrink-0 flex items-center gap-4 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {progress ? `${progress.completed_sections}/${progress.total_sections}` : `0/${book.total_sections}`} sections
                  </span>
                  {progress && progress.average_score !== null && progress.average_score > 0 && (
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                      <Star className="w-4 h-4 fill-current" />
                      {progress.average_score.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Status Icon */}
            <div className="shrink-0">
              {progress?.is_completed ? (
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              ) : (
                <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Grid View
  return (
    <Link href={`/dashboard/books/${book.id}`} className="block group">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 overflow-hidden h-full">
        {/* Card Header with Gradient */}
        <div className={`relative h-32 bg-linear-to-br ${getProgressGradient(progressPercentage)} p-6`}>
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10 flex items-start justify-between h-full">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm text-white border border-white/30`}>
              {book.level}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1 line-clamp-2">
            {book.title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 truncate">
            {book.author || 'IELTS Practice Book'}
          </p>

          {/* Progress Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Progress</span>
              <span className="font-semibold text-gray-900 dark:text-white">{progressPercentage}%</span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${getProgressColor(progressPercentage)}`}
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>{progress ? progress.completed_sections : 0}/{book.total_sections} sections</span>
              </div>
              
              {progress && progress.average_score !== null && progress.average_score > 0 && (
                <div className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 font-semibold">
                  <Star className="w-4 h-4 fill-current" />
                  {progress.average_score.toFixed(1)}
                </div>
              )}
            </div>
          </div>

          {/* Status Badge */}
          {progress?.is_completed && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Award className="w-4 h-4" />
                <span className="text-sm font-semibold">Completed</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
