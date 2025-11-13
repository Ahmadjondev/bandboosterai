/**
 * Manager Panel Types
 */

// Re-export AI content types
export * from './ai-content';

// Re-export mock tests types
export * from './mock-tests';

// Dashboard Stats
export interface DashboardStats {
  total_students: number;
  active_students: number;
  new_students_this_week: number;
  new_students_this_month: number;
  total_mock_exams: number;
  active_mock_exams: number;
  upcoming_exams: number;
  total_results: number;
  results_this_month: number;
  completion_rate: number;
  average_score: number;
  engagement_rate: number;
  total_reading_passages: number;
  total_listening_parts: number;
  total_writing_tasks: number;
  total_speaking_topics: number;
  performance_trend: PerformanceTrend[];
  score_distribution: Record<string, number>;
  section_performance: SectionPerformance[];
  top_performers: TopPerformer[];
  recent_students: RecentStudent[];
  recent_results: RecentResult[];
}

export interface PerformanceTrend {
  week: string;
  date: string;
  count: number;
  average_score: number;
}

export interface SectionPerformance {
  section: string;
  average: number;
  total_tests: number;
  color: string;
}

export interface TopPerformer {
  id: number;
  name: string;
  email: string;
  score: number;
  date: string;
}

export interface RecentStudent {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  date_joined: string;
}

export interface RecentResult {
  id: number;
  student_name: string;
  exam_title: string;
  overall_band_score: number;
  completed_at: string;
}

// Student Types
export interface Student {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
  completed_tests_count: number;
  average_score: number | null;
}

export interface StudentForm {
  first_name: string;
  last_name: string;
  phone: string;
  password: string;
  is_active: boolean;
}

export interface BulkCreateResponse {
  created: number;
  failed: number;
  errors: string[];
}

// Reading Test Types
export interface ReadingPassage {
  id: number;
  title: string;
  passage_text: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  category: string;
  is_active: boolean;
  created_at: string;
  total_questions: number;
}

export interface ReadingPassageForm {
  title: string;
  passage_text: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  category: string;
  is_active: boolean;
}

// Listening Test Types
export interface ListeningPart {
  id: number;
  part_number: number;
  title: string;
  transcript: string;
  description?: string | null;
  duration_seconds?: number | null;
  audio_url: string;
  audio_file?: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  is_active: boolean;
  created_at: string;
  total_questions: number;
}

// Writing Task Types
export interface WritingTask {
  id: number;
  task_type: 'TASK_1' | 'TASK_2';
  prompt: string;
  min_words: number;
  picture?: string | null;
  data?: any;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
}

// Speaking Topic Types
export interface SpeakingTopic {
  id: number;
  speaking_type: 'PART_1' | 'PART_2' | 'PART_3';
  topic: string;
  question?: string;
  cue_card?: string[] | null;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
}

// Test Head and Question Types
export interface TestHead {
  id: number;
  title: string;
  instructions: string;
  question_type: QuestionType;
  passage?: number;
  listening_part?: number;
  questions: Question[];
}

export type QuestionType =
  | 'MCQ'
  | 'TFNG'
  | 'MATCHING'
  | 'SHORT_ANSWER'
  | 'SUMMARY_COMPLETION'
  | 'NOTE_COMPLETION'
  | 'FORM_COMPLETION'
  | 'TABLE_COMPLETION'
  | 'DIAGRAM_LABELING'
  | 'MAP_LABELING';

export interface Question {
  id: number;
  question_number: number;
  question_text: string;
  correct_answer: string;
  options?: string[];
  explanation?: string;
}

export interface QuestionForm {
  testhead: number;
  question_number: number;
  question_text: string;
  correct_answer: string;
  options?: string[];
  explanation?: string;
}

// Mock Test Types
export interface MockTest {
  id: number;
  title: string;
  description: string;
  test_type: 'LISTENING_READING' | 'LISTENING_READING_WRITING' | 'FULL_TEST';
  duration_minutes: number | null;
  reading_passages: number[];
  listening_parts: number[];
  writing_tasks: number[];
  speaking_topics: number[];
  is_active: boolean;
  created_at: string;
  assigned_students_count: number;
}

export interface MockTestForm {
  title: string;
  description: string;
  test_type: 'LISTENING_READING' | 'LISTENING_READING_WRITING' | 'FULL_TEST';
  duration_minutes?: number;
  reading_passages: number[];
  listening_parts: number[];
  writing_tasks: number[];
  speaking_topics: number[];
  is_active: boolean;
}

// Exam (Scheduled) Types
export interface Exam {
  id: number;
  mock_test: MockTest;
  title: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  assigned_students: Student[];
  created_at: string;
  attempts_count: number;
  completed_count: number;
}

export interface ExamForm {
  mock_test: number;
  title: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  duration_minutes?: number;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  assigned_students: number[];
}

// Results Types
export interface StudentResult {
  id: number;
  student: Student;
  exam: Exam | null;
  mock_test: MockTest;
  overall_band_score: number;
  listening_score: number | null;
  reading_score: number | null;
  writing_score: number | null;
  speaking_score: number | null;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED';
  started_at: string;
  completed_at: string | null;
}

export interface StudentResultDetail extends StudentResult {
  section_details: {
    listening?: SectionAttemptDetail;
    reading?: SectionAttemptDetail;
    writing?: SectionAttemptDetail;
    speaking?: SectionAttemptDetail;
  };
}

export interface SectionAttemptDetail {
  score: number;
  band_score: number;
  total_questions: number;
  correct_answers: number;
  answers: Record<string, any>;
}

// Pagination
export interface PaginationData {
  count: number;
  total: number;
  next: string | null;
  previous: string | null;
  page_size: number;
  current_page: number;
  total_pages: number;
  pages: number;
  current: number;
  per_page: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
  page_size: number;
  current_page: number;
  total_pages: number;
}

// API Error
export interface APIError {
  error?: string;
  detail?: string;
  [key: string]: any;
}
