/**
 * TypeScript types for Book-based IELTS Practice System
 * Matches Django models in books/models.py
 */

import { User } from './auth';

/**
 * IELTS Level enum
 */
export type IELTSLevel = 'B1' | 'B2' | 'C1' | 'C2';

/**
 * Section Type enum
 */
export type SectionType = 'READING' | 'LISTENING';

/**
 * Book model
 * Represents an IELTS practice book
 */
export interface Book {
  id: number;
  title: string;
  description: string;
  level: IELTSLevel;
  cover_image: string | null;
  total_sections: number;
  author?: string | null;
  publisher?: string | null;
  publication_year?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_progress?: UserBookProgress | null;
}

/**
 * Reading Passage (simplified for books context)
 */
export interface ReadingPassage {
  id: number;
  title: string;
  passage?: string; // Old field name
  content?: string; // New field name from serializer
  difficulty?: string;
  test_heads?: any[]; // Full TestHead structure from exam.ts
}

/**
 * Listening Part (simplified for books context)
 */
export interface ListeningPart {
  id: number;
  title: string;
  audio_file?: string; // Local path
  audio_url?: string; // Full URL from serializer
  transcript?: string;
  description?: string;
  difficulty?: string;
  test_heads?: any[]; // Full TestHead structure from exam.ts
}

/**
 * Book Section model
 * Links book to reading passage or listening part
 */
export interface BookSection {
  id: number;
  book: number; // Book ID
  section_type: SectionType;
  title: string; // Added from get_title() method
  description?: string;
  reading_passage?: ReadingPassage;
  listening_part?: ListeningPart;
  order: number;
  is_locked: boolean;
  total_questions: number; // Added from serializer
  duration_minutes?: number;
  user_status?: {
    completed: boolean;
    score: number | null;
    attempt_count: number;
    is_accessible: boolean;
  };
}

/**
 * User Book Progress model
 * Tracks student progress through a book
 */
export interface UserBookProgress {
  id?: number;
  user?: number; // User ID
  book?: number; // Book ID
  completed_sections: number;
  total_sections: number;
  is_started: boolean;
  is_completed: boolean;
  average_score: number | null;
  percentage: number;
  last_accessed: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * User Section Result model
 * Stores student's result for a specific section
 */
export interface UserSectionResult {
  id: number;
  user: number; // User ID
  section: number; // BookSection ID
  answers: Record<string, any>;
  score: number;
  is_completed: boolean;
  time_spent: number; // seconds
  attempt_count: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * API Response Types
 */

export interface BooksListResponse {
  books: Book[];
}

export interface BookDetailResponse extends Book {
  sections?: BookSection[]; // Optional - fetch separately using getBookSections()
  user_progress: UserBookProgress | null;
}

export interface SectionDetailResponse {
  id: number;
  book: {
    id: number;
    title: string;
  };
  section_type: SectionType;
  title: string;
  reading_passage?: ReadingPassage;
  listening_part?: ListeningPart;
  order: number;
  is_locked: boolean;
  total_questions: number;
  duration_minutes?: number;
  user_status?: {
    completed: boolean;
    score: number | null;
    attempt_count: number;
    is_accessible: boolean;
  };
  user_result?: UserSectionResult;
}

export interface SubmitSectionRequest {
  answers: Record<string, any>;
  time_spent: number;
}

export interface SubmitSectionResponse extends UserSectionResult {
  progress_updated: boolean;
  book_completed: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  average_score: number;
  completed_sections: number;
  total_sections: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
}

export interface MotivationStats {
  total_books: number;
  completed_books: number;
  in_progress_books: number;
  total_sections_completed: number;
  average_score: number | null;
  current_book: {
    id: number;
    title: string;
    completed_sections: number;
    total_sections: number;
    percentage: number;
  } | null;
  motivation_message: string | null;
}

/**
 * UI Helper Types
 */

export interface BookCardData extends Book {
  progressPercentage: number;
  progressText: string;
  statusColor: 'green' | 'yellow' | 'gray';
}

export interface SectionListItem extends BookSection {
  statusIcon: '✅' | '🔄' | '🔒';
  statusText: string;
  canStart: boolean;
}

export interface ProgressBarData {
  completed: number;
  total: number;
  percentage: number;
  color: string;
}

/**
 * Practice Session State
 */
export interface PracticeSession {
  sectionId: number;
  bookId: number;
  sectionType: SectionType;
  startTime: number;
  answers: Record<string, any>;
  currentQuestionIndex: number;
  totalQuestions: number;
}

/**
 * Result Display Data
 */
export interface ResultDisplayData {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  attemptCount: number;
  encouragementMessage: string;
  nextSectionId?: number;
  bookCompleted: boolean;
}
