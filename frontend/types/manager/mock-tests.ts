/**
 * Manager Mock Tests Types
 * Type definitions for IELTS mock test management
 */

import type { PaginationData } from './index';

// Exam Types
export type ExamType =
  | 'FULL_TEST'
  | 'LISTENING_READING'
  | 'LISTENING_READING_WRITING'
  | 'READING'
  | 'LISTENING'
  | 'WRITING'
  | 'SPEAKING';

export type DifficultyLevel = 'EASY' | 'INTERMEDIATE' | 'HARD';

// Mock Test
export interface MockTest {
  id: number;
  uuid: string;
  title: string;
  description: string;
  exam_type: ExamType;
  exam_type_display: string;
  difficulty: DifficultyLevel;
  difficulty_display: string;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Content relationships
  reading_passages: ReadingPassageSummary[];
  listening_parts: ListeningPartSummary[];
  writing_tasks: WritingTaskSummary[];
  speaking_topics: SpeakingTopicSummary[];
  // Statistics
  attempt_count?: number;
}

// Content Summaries
export interface ReadingPassageSummary {
  id: number;
  title: string;
  passage_number: number;
  word_count: number;
  difficulty: string;
  difficulty_display?: string;
}

export interface ListeningPartSummary {
  id: number;
  title: string;
  part_number: number;
  duration: number;
  difficulty: string;
  difficulty_display?: string;
}

export interface WritingTaskSummary {
  id: number;
  title?: string;
  prompt: string;
  task_type: 'TASK_1' | 'TASK_2';
  task_type_display: string;
  difficulty: string;
  difficulty_display?: string;
}

export interface SpeakingTopicSummary {
  id: number;
  title?: string;
  topic: string;
  question?: string;
  speaking_type: 'PART_1' | 'PART_2' | 'PART_3';
  speaking_type_display: string;
  difficulty?: string;
  difficulty_display?: string;
}

// Form data for create/edit
export interface MockTestForm {
  title: string;
  description: string;
  exam_type: ExamType;
  difficulty: DifficultyLevel;
  is_active: boolean;
  reading_passages: number[];
  listening_parts: number[];
  writing_tasks: number[];
  speaking_topics: number[];
}

// Structured content by position (for form state)
export interface StructuredMockTestContent {
  reading_passages: {
    passage_1: ReadingPassageSummary | null;
    passage_2: ReadingPassageSummary | null;
    passage_3: ReadingPassageSummary | null;
  };
  listening_parts: {
    part_1: ListeningPartSummary | null;
    part_2: ListeningPartSummary | null;
    part_3: ListeningPartSummary | null;
    part_4: ListeningPartSummary | null;
  };
  writing_tasks: {
    task_1: WritingTaskSummary | null;
    task_2: WritingTaskSummary | null;
  };
  speaking_topics: {
    topic_1: SpeakingTopicSummary | null;
    topic_2: SpeakingTopicSummary | null;
    topic_3: SpeakingTopicSummary | null;
  };
}

// Statistics
export interface MockTestStatistics {
  total_attempts: number;
  completed_attempts: number;
  in_progress: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  avg_overall_band?: number;
  avg_reading_band?: number;
  avg_listening_band?: number;
  avg_writing_band?: number;
  avg_speaking_band?: number;
}

// Recent Attempt
export interface RecentAttempt {
  id: number;
  uuid: string;
  student_id: number;
  student_name: string;
  student_email: string;
  started_at: string;
  status: string;
  overall_score?: number;
  listening_score?: number;
  reading_score?: number;
  writing_score?: number;
  speaking_score?: number;
  completed_at: string;
  created_at: string;
}

// API Responses
export interface MockTestsResponse {
  success: boolean;
  tests: MockTest[];
  pagination: PaginationData;
}

export interface MockTestDetailResponse {
  success: boolean;
  test: MockTest;
  statistics: MockTestStatistics;
  recent_attempts: RecentAttempt[];
}

export interface MockTestCreateResponse {
  success: boolean;
  message: string;
  test: MockTest;
}

export interface MockTestUpdateResponse {
  success: boolean;
  message: string;
  test: MockTest;
}

export interface MockTestDeleteResponse {
  success: boolean;
  message: string;
}

export interface MockTestToggleResponse {
  success: boolean;
  message: string;
  test: MockTest;
}

// Filters
export interface MockTestsFilters {
  status?: 'active' | 'inactive' | '';
  exam_type?: ExamType | '';
  search?: string;
  page?: number;
}

// Available content for selection
export interface AvailableReadingPassages {
  passages: ReadingPassageSummary[];
}

export interface AvailableListeningParts {
  parts: ListeningPartSummary[];
}

export interface AvailableWritingTasks {
  tasks: WritingTaskSummary[];
}

export interface AvailableSpeakingTopics {
  topics: SpeakingTopicSummary[];
}
