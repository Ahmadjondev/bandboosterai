/**
 * Section Practices Types - Separated by Section
 * Types for managing Listening, Reading, Writing, and Speaking practices
 */

// ============================================================================
// Common Types
// ============================================================================

export type SectionType = 'listening' | 'reading' | 'writing' | 'speaking';
export type PracticeDifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

// Base practice interface
export interface BasePractice {
  id: number;
  uuid: string;
  title: string;
  description: string;
  section_type: string;
  section_type_display: string;
  difficulty: PracticeDifficultyLevel;
  difficulty_display: string;
  duration_minutes: number;
  total_questions: number;
  is_active: boolean;
  is_free: boolean;
  order: number;
  attempts_count: number;
  created_at: string;
  updated_at: string;
  created_by: {
    id: number;
    name: string;
  } | null;
}

// Recent attempt info
export interface RecentAttempt {
  id: number;
  student: {
    id: number;
    name: string;
  };
  status: string;
  score: number | null;
  started_at: string | null;
  completed_at: string | null;
}

// Pagination info
export interface PracticesPagination {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

// ============================================================================
// Listening Types
// ============================================================================

export interface ListeningContent {
  id: number;
  type: 'listening';
  title: string;
  part_number: number;
  difficulty?: string;
  has_audio: boolean;
  questions_count: number;
  description?: string;
  audio_url?: string;
  transcript?: string;
  test_heads?: Array<{
    id: number;
    title: string;
    question_type: string;
    instructions: string;
    questions_count: number;
  }>;
}

export interface ListeningPractice extends BasePractice {
  content: ListeningContent;
}

export interface ListeningPracticeDetail extends ListeningPractice {
  recent_attempts: RecentAttempt[];
}

export interface AvailableListeningContent {
  id: number;
  title: string;
  part_number: number;
  difficulty: string;
  has_audio: boolean;
  questions_count: number;
  created_at: string;
}

export interface ListeningPracticesResponse {
  practices: ListeningPractice[];
  pagination: PracticesPagination;
}

// ============================================================================
// Reading Types
// ============================================================================

export interface ReadingContent {
  id: number;
  type: 'reading';
  title: string;
  passage_number: number;
  difficulty?: string;
  word_count: number;
  questions_count: number;
  content_preview?: string;
  test_heads?: Array<{
    id: number;
    title: string;
    question_type: string;
    instructions: string;
    questions_count: number;
  }>;
}

export interface ReadingPractice extends BasePractice {
  content: ReadingContent;
}

export interface ReadingPracticeDetail extends ReadingPractice {
  recent_attempts: RecentAttempt[];
}

export interface AvailableReadingContent {
  id: number;
  title: string;
  passage_number: number;
  difficulty: string;
  word_count: number;
  questions_count: number;
  created_at: string;
}

export interface ReadingPracticesResponse {
  practices: ReadingPractice[];
  pagination: PracticesPagination;
}

// ============================================================================
// Writing Types
// ============================================================================

export type WritingTaskType = 'TASK_1' | 'TASK_2';
export type ChartType =
  | 'LINE_GRAPH'
  | 'BAR_CHART'
  | 'PIE_CHART'
  | 'TABLE'
  | 'MAP'
  | 'PROCESS'
  | 'FLOW_CHART'
  | 'MIXED'
  | 'OTHER';

export interface WritingContent {
  id: number;
  type: 'writing';
  title: string;
  task_type: WritingTaskType;
  task_type_display: string;
  chart_type: ChartType | null;
  chart_type_display: string | null;
  min_words: number;
  has_image: boolean;
  prompt?: string;
  picture_url?: string;
  sample_answer?: string;
}

export interface WritingPractice extends BasePractice {
  content: WritingContent;
}

export interface WritingPracticeDetail extends WritingPractice {
  recent_attempts: RecentAttempt[];
}

export interface AvailableWritingContent {
  id: number;
  title: string;
  task_type: WritingTaskType;
  task_type_display: string;
  chart_type: ChartType | null;
  chart_type_display: string | null;
  min_words: number;
  has_image: boolean;
  created_at: string;
}

export interface WritingPracticesResponse {
  practices: WritingPractice[];
  pagination: PracticesPagination;
  available_filters: {
    chart_types: Array<{ value: string; label: string }>;
    task_types: Array<{ value: string; label: string }>;
  };
}

// ============================================================================
// Speaking Types
// ============================================================================

export type SpeakingType = 'PART_1' | 'PART_2' | 'PART_3';

export interface SpeakingContent {
  id: number;
  type: 'speaking';
  title: string;
  speaking_type: SpeakingType;
  speaking_type_display: string;
  questions_count: number;
  questions?: Array<{
    id: number;
    text: string;
    order: number;
    has_audio: boolean;
    preparation_time?: number;
    response_time?: number;
  }>;
}

export interface SpeakingPractice extends BasePractice {
  content: SpeakingContent;
}

export interface SpeakingPracticeDetail extends SpeakingPractice {
  recent_attempts: RecentAttempt[];
}

export interface AvailableSpeakingContent {
  id: number;
  title: string;
  speaking_type: SpeakingType;
  speaking_type_display: string;
  questions_count: number;
  created_at: string;
}

export interface SpeakingPracticesResponse {
  practices: SpeakingPractice[];
  pagination: PracticesPagination;
  available_filters: {
    speaking_types: Array<{ value: string; label: string }>;
  };
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface SectionStats {
  total: number;
  active: number;
  free: number;
  premium: number;
  attempts: number;
  completed_attempts: number;
  avg_score: number;
}

export interface PracticesStats {
  total: number;
  active: number;
  inactive: number;
  free: number;
  premium: number;
  by_section: {
    listening: number;
    reading: number;
    writing: number;
    speaking: number;
  };
  by_difficulty: {
    easy: number;
    medium: number;
    hard: number;
    expert: number;
  };
  attempts: {
    total: number;
    completed: number;
    in_progress: number;
    avg_score: number;
  };
  section_stats: {
    listening: SectionStats;
    reading: SectionStats;
    writing: SectionStats;
    speaking: SectionStats;
  };
  recent_practices: Array<{
    id: number;
    title: string;
    section_type: string;
    section_type_display: string;
    difficulty: string;
    is_active: boolean;
    created_at: string;
  }>;
}

// ============================================================================
// Bulk Operations Types
// ============================================================================

export interface BulkCreateRequest {
  content_ids: number[];
  default_difficulty?: PracticeDifficultyLevel;
  default_is_free?: boolean;
  default_is_active?: boolean;
}

export interface BulkCreateResult {
  success: boolean;
  message: string;
  created: Array<{
    id: number;
    title: string;
    content_id: number;
    // Section-specific fields
    task_type?: string;
    chart_type?: string;
    speaking_type?: string;
  }>;
  skipped: Array<{
    id: number;
    reason: string;
  }>;
  errors: Array<{
    id: number;
    error: string;
  }>;
  summary: {
    total_requested: number;
    created_count: number;
    skipped_count: number;
    error_count: number;
  };
}

// ============================================================================
// Form Types
// ============================================================================

export interface CreatePracticeForm {
  content_id: number;
  title?: string;
  description?: string;
  difficulty?: PracticeDifficultyLevel;
  duration_minutes?: number;
  is_free?: boolean;
  is_active?: boolean;
  order?: number;
}

export interface UpdatePracticeForm {
  title?: string;
  description?: string;
  difficulty?: PracticeDifficultyLevel;
  duration_minutes?: number;
  is_free?: boolean;
  is_active?: boolean;
  order?: number;
}

// ============================================================================
// Filter Types
// ============================================================================

export interface BasePracticeFilters {
  difficulty?: PracticeDifficultyLevel;
  is_active?: boolean;
  is_free?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface WritingPracticeFilters extends BasePracticeFilters {
  task_type?: WritingTaskType;
  chart_type?: ChartType;
}

export interface SpeakingPracticeFilters extends BasePracticeFilters {
  speaking_type?: SpeakingType;
}

// Alias types for consistency
export type ListeningPracticeFilters = BasePracticeFilters;
export type ReadingPracticeFilters = BasePracticeFilters;

// ============================================================================
// Available Content Response Types
// ============================================================================

export interface AvailableListeningResponse {
  content: AvailableListeningContent[];
  total: number;
}

export interface AvailableReadingResponse {
  content: AvailableReadingContent[];
  total: number;
}

export interface AvailableWritingResponse {
  content: AvailableWritingContent[];
  total: number;
  available_filters: {
    chart_types: Array<{ value: string; label: string }>;
    task_types: Array<{ value: string; label: string }>;
  };
}

export interface AvailableSpeakingResponse {
  content: AvailableSpeakingContent[];
  total: number;
  available_filters: {
    speaking_types: Array<{ value: string; label: string }>;
  };
}

// ============================================================================
// Simplified Types for Components
// ============================================================================

// Generic practice item for component usage
export interface PracticeItem {
  id: number;
  uuid?: string;
  title: string;
  description?: string;
  section_type?: string;
  difficulty: PracticeDifficultyLevel;
  duration_minutes?: number | null;
  is_active: boolean;
  is_free: boolean;
  order?: number;
  total_attempts?: number;
  average_score?: number | null;
  created_at: string;
  updated_at: string;
  content?: {
    id: number;
    title?: string;
    // Listening
    part_number?: number;
    // Reading
    passage_number?: number;
    // Writing
    task_type?: string;
    chart_type?: string;
    // Speaking
    speaking_type?: string;
    part?: number;
    topic_type?: string;
    questions_count?: number;
  } | null;
}

// Generic filters for component usage
export interface PracticeFilters {
  difficulty?: PracticeDifficultyLevel;
  is_active?: boolean;
  is_free?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
  task_type?: string;
  chart_type?: string;
}

// Stats response
export interface PracticeStats {
  total: number;
  active: number;
  free: number;
  total_attempts: number;
}

// Content item for available content list
export interface ContentItem {
  id: number;
  title: string;
  // Listening
  part_number?: number;
  // Reading
  passage_number?: number;
  // Writing
  task_type?: string;
  chart_type?: string;
  // Speaking
  speaking_type?: string;
  questions_count?: number;
  difficulty?: string;
  created_at?: string;
}

// Bulk add types
export interface BulkAddItem {
  content_id: number;
}

export interface BulkAddResponse {
  success: boolean;
  message: string;
  created_count: number;
  skipped_count?: number;
  error_count?: number;
}
