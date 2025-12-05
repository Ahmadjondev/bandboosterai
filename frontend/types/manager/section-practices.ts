/**
 * Section Practices Manager Types
 */

// Section type enum
export type SectionType = 'reading' | 'listening' | 'writing' | 'speaking';

// Filter types
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

export type PracticeDifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

// Section Practice Item (from list endpoint)
export interface SectionPracticeItem {
  id: number;
  uuid: string;
  section_type: string;
  section_type_display: string;
  title: string;
  description?: string;
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
  content: SectionPracticeContent;
  created_by?: {
    id: number;
    name: string;
  } | null;
}

// Content info from the practice
export interface SectionPracticeContent {
  type: string;
  id: number;
  title: string;
  // Extra fields based on section type
  task_type?: WritingTaskType;
  chart_type?: ChartType;
  part_number?: number;
  topic_type?: string;
  questions_count?: number;
}

// Section Practice Detail
export interface SectionPracticeDetail {
  id: number;
  uuid: string;
  section_type: string;
  section_type_display: string;
  title: string;
  description: string;
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
  // Related content (one will be populated)
  reading_passage?: ReadingContent | null;
  listening_part?: ListeningContent | null;
  writing_task?: WritingContent | null;
  speaking_topic?: SpeakingContent | null;
}

// Related content types
export interface ReadingContent {
  id: number;
  title: string;
  passage_text: string;
  test_heads: TestHeadContent[];
}

export interface TestHeadContent {
  id: number;
  title: string;
  question_type: string;
  instructions: string;
  questions: QuestionContent[];
}

export interface QuestionContent {
  id: number;
  question_number: number;
  question_text: string;
  answer: string;
  options?: string[];
  paragraph?: string;
}

export interface ListeningContent {
  id: number;
  title: string;
  part_number: number;
  audio_url?: string;
  transcript?: string;
  test_heads: TestHeadContent[];
}

export interface WritingContent {
  id: number;
  title: string;
  task_type: WritingTaskType;
  chart_type?: ChartType;
  task_text: string;
  image_url?: string;
}

export interface SpeakingContent {
  id: number;
  title: string;
  topic_type: string;
  questions: SpeakingQuestionContent[];
}

export interface SpeakingQuestionContent {
  id: number;
  question_order: number;
  question_text: string;
  preparation_time?: number;
  response_time?: number;
}

// Available content for creating practices
export interface AvailableContentItem {
  id: number;
  title: string;
  extra_info?: string;
  task_type?: string;
  chart_type?: string;
  part_number?: number;
  topic_type?: string;
}

export interface PracticeAvailableContent {
  reading: AvailableContentItem[];
  listening: AvailableContentItem[];
  writing: AvailableContentItem[];
  speaking: AvailableContentItem[];
}

// Create/Update practice form
export interface SectionPracticeForm {
  section_type: SectionType;
  title: string;
  description?: string;
  difficulty: PracticeDifficultyLevel;
  duration_minutes?: number;
  is_free?: boolean;
  is_active?: boolean;
  // Content ID based on section type
  reading_passage_id?: number;
  listening_part_id?: number;
  writing_task_id?: number;
  speaking_topic_id?: number;
}

// Stats response
export interface SectionPracticeStats {
  total_practices: number;
  active_practices: number;
  free_practices: number;
  by_section: {
    reading: number;
    listening: number;
    writing: number;
    speaking: number;
  };
  by_difficulty: {
    EASY: number;
    MEDIUM: number;
    HARD: number;
    EXPERT: number;
  };
  total_attempts: number;
  recent_practices: Array<{
    id: number;
    title: string;
    section_type: string;
    created_at: string;
  }>;
}

// List response with pagination
export interface SectionPracticesListResponse {
  practices: SectionPracticeItem[];
  pagination: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  available_filters?: {
    chart_types: Array<{ value: string; label: string }>;
    task_types: Array<{ value: string; label: string }>;
  };
}

// Filter params for API
export interface SectionPracticeFilters {
  section_type?: SectionType;
  difficulty?: PracticeDifficultyLevel;
  is_free?: boolean;
  is_active?: boolean;
  task_type?: WritingTaskType;
  chart_type?: ChartType;
  search?: string;
  page?: number;
  page_size?: number;
}

// Bulk operation response
export interface BulkOperationResult {
  success: boolean;
  updated_count?: number;
  deleted_count?: number;
  errors?: string[];
}
