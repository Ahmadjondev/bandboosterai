/**
 * Books API Client
 * API functions for book-based IELTS practice system
 */

import { apiClient } from '../api-client';
import {
  Book,
  BookSection,
  BookDetailResponse,
  BooksListResponse,
  LeaderboardResponse,
  MotivationStats,
  SectionDetailResponse,
  SubmitSectionRequest,
  SubmitSectionResponse,
} from '@/types/books';

const BOOKS_API_BASE = '/books/api';

/**
 * Get all active books with user progress
 */
export async function getBooks(): Promise<Book[]> {
  const response = await apiClient.get<Book[]>(
    `${BOOKS_API_BASE}/books/`
  );
  return response.data || [];
}

/**
 * Get book details including sections and progress
 * @param bookId - Book ID
 */
export async function getBookDetail(bookId: number): Promise<BookDetailResponse> {
  const response = await apiClient.get<BookDetailResponse>(
    `${BOOKS_API_BASE}/books/${bookId}/`
  );
  if (!response.data) {
    throw new Error('Failed to fetch book details');
  }
  return response.data;
}

/**
 * Get all sections for a specific book
 * @param bookId - Book ID
 */
export async function getBookSections(bookId: number): Promise<BookSection[]> {
  const response = await apiClient.get<BookSection[]>(
    `${BOOKS_API_BASE}/books/${bookId}/sections/`
  );
  return response.data || [];
}

/**
 * Get section detail with content and user result
 * @param sectionId - BookSection ID
 */
export async function getSectionDetail(
  sectionId: number
): Promise<SectionDetailResponse> {
  const response = await apiClient.get<SectionDetailResponse>(
    `${BOOKS_API_BASE}/sections/${sectionId}/`
  );
  if (!response.data) {
    throw new Error('Failed to fetch section details');
  }
  return response.data;
}

/**
 * Submit answers for a section
 * @param sectionId - BookSection ID
 * @param data - Answers and time spent
 */
export async function submitSectionAnswers(
  sectionId: number,
  data: SubmitSectionRequest
): Promise<SubmitSectionResponse> {
  const response = await apiClient.post<SubmitSectionResponse>(
    `${BOOKS_API_BASE}/sections/${sectionId}/submit/`,
    data
  );
  if (!response.data) {
    throw new Error('Failed to submit section answers');
  }
  return response.data;
}

/**
 * Get result for a section
 * @param sectionId - BookSection ID
 */
export async function getSectionResult(sectionId: number) {
  const response = await apiClient.get(
    `${BOOKS_API_BASE}/sections/${sectionId}/result/`
  );
  if (!response.data) {
    throw new Error('Failed to fetch section result');
  }
  return response.data;
}

/**
 * Get leaderboard for a specific book or all books
 * @param bookId - Optional book ID to filter
 */
export async function getLeaderboard(
  bookId?: number
): Promise<LeaderboardResponse> {
  const url = bookId
    ? `${BOOKS_API_BASE}/leaderboard/?book=${bookId}`
    : `${BOOKS_API_BASE}/leaderboard/`;
  
  const response = await apiClient.get<LeaderboardResponse>(url);
  if (!response.data) {
    throw new Error('Failed to fetch leaderboard');
  }
  return response.data;
}

/**
 * Get user's motivation statistics
 */
export async function getMotivationStats(): Promise<MotivationStats> {
  const response = await apiClient.get<MotivationStats>(
    `${BOOKS_API_BASE}/motivation/`
  );
  if (!response.data) {
    throw new Error('Failed to fetch motivation stats');
  }
  return response.data;
}

/**
 * Helper Functions
 */

/**
 * Calculate progress percentage
 */
export function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Get progress color based on percentage
 */
export function getProgressColor(percentage: number): string {
  if (percentage === 100) return 'green';
  if (percentage >= 50) return 'yellow';
  return 'gray';
}

/**
 * Get status icon for section
 */
export function getSectionStatusIcon(
  completed: boolean,
  isLocked: boolean
): '✅' | '🔄' | '🔒' {
  if (completed) return '✅';
  if (isLocked) return '🔒';
  return '🔄';
}

/**
 * Get status text for section
 */
export function getSectionStatusText(
  completed: boolean,
  isLocked: boolean,
  score?: number | null
): string {
  if (completed && score !== null && score !== undefined) {
    return `Completed - ${score}%`;
  }
  if (completed) return 'Completed';
  if (isLocked) return 'Locked';
  return 'Available';
}

/**
 * Get encouragement message based on score
 */
export function getEncouragementMessage(score: number): string {
  if (score >= 90) return '🎉 Excellent! Outstanding performance!';
  if (score >= 80) return '🌟 Great job! You\'re doing very well!';
  if (score >= 70) return '👍 Good work! Keep it up!';
  if (score >= 60) return '💪 Nice effort! You\'re improving!';
  if (score >= 50) return '📚 Keep practicing! You can do better!';
  return '🎯 Don\'t give up! Practice makes perfect!';
}

/**
 * Format time spent (seconds to readable format)
 */
export function formatTimeSpent(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 
      ? `${minutes}m ${remainingSeconds}s` 
      : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m`
    : `${hours}h`;
}

/**
 * Calculate total time in seconds from start timestamp
 */
export function calculateTimeSpent(startTime: number): number {
  return Math.floor((Date.now() - startTime) / 1000);
}

/**
 * Get level badge color
 */
export function getLevelBadgeColor(level: string): string {
  switch (level) {
    case 'C2':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'C1':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'B2':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'B1':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
}

/**
 * Get score badge color
 */
export function getScoreBadgeColor(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  if (score >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
}

/**
 * Check if section can be started (not locked)
 */
export function canStartSection(section: SectionDetailResponse): boolean {
  return !section.is_locked;
}

/**
 * Get next section ID from sections array
 */
export function getNextSectionId(
  sections: any[],
  currentSectionId: number
): number | undefined {
  const currentIndex = sections.findIndex((s) => s.id === currentSectionId);
  if (currentIndex === -1 || currentIndex === sections.length - 1) {
    return undefined;
  }
  return sections[currentIndex + 1].id;
}
