/**
 * Section Practice Types
 * Types for the section-by-section IELTS practice feature
 */

export type SectionType = 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
export type AttemptStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';

/**
 * Section Practice item
 */
export interface SectionPractice {
  uuid: string;
  title: string;
  description: string | null;
  section_type: SectionType;
  section_type_display: string;
  difficulty: Difficulty;
  difficulty_display: string;
  duration: number;
  total_questions: number;
  is_free: boolean;
  attempts_count: number;
  best_score: number | null;
  last_attempt_date: string | null;
  created_at: string;
  // Speaking-specific fields
  speaking_part: number | null;
  speaking_topic_name: string | null;
}

/**
 * Reading question for practice
 */
export interface PracticeQuestion {
  id: number;
  order: number;
  question_text: string;
  options?: { id: number; key: string; choice_text: string }[];
}

/**
 * Test head containing questions
 */
export interface PracticeTestHead {
  id: number;
  title?: string;
  description?: string;
  question_type: string;
  questions: PracticeQuestion[];
}

/**
 * Reading passage content
 */
export interface ReadingPassageContent {
  id: number;
  passage_number: number;
  title: string;
  passage_text: string;
  test_heads: PracticeTestHead[];
}

/**
 * Listening part content
 */
export interface ListeningPartContent {
  id: number;
  part_number: number;
  title: string;
  audio_url: string | null;
  test_heads: PracticeTestHead[];
}

/**
 * Writing task content
 */
export interface WritingTaskContent {
  id: number;
  task_type: string;
  task_type_display: string;
  prompt: string;
  image_url: string | null;
  min_words: number;
}

/**
 * Speaking question for practice
 */
export interface SpeakingPracticeQuestion {
  id: number;
  question_text: string;
  audio_url: string | null;
  cue_card_points: string[] | null;
  order: number;
  question_key: string;
  preparation_time: number;
  response_time: number;
}

/**
 * Speaking topic content
 */
export interface SpeakingTopicContent {
  id: number;
  topic: string;
  speaking_type: string;
  speaking_type_display: string;
  questions: SpeakingPracticeQuestion[];
}

/**
 * Section practice content - union type
 */
export type PracticeContent =
  | ReadingPassageContent
  | ListeningPartContent
  | WritingTaskContent
  | SpeakingTopicContent;

/**
 * Section practice attempt
 */
export interface SectionPracticeAttempt {
  uuid: string;
  practice_title: string;
  section_type: SectionType;
  status: AttemptStatus;
  started_at: string;
  completed_at: string | null;
  time_spent_seconds: number;
  score: number | null;
  correct_answers: number;
  total_questions: number;
  accuracy: number;
  ai_feedback: string | null;
}

/**
 * Detailed section practice with content
 */
export interface SectionPracticeDetail extends Omit<SectionPractice, 'attempts_count' | 'best_score' | 'last_attempt_date'> {
  content: PracticeContent | null;
  user_attempts: SectionPracticeAttempt[];
}

/**
 * Pagination info
 */
export interface PaginationInfo {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

/**
 * Status filter type
 */
export type StatusFilter = 'all' | 'completed' | 'uncompleted';

/**
 * Section practice list response by type
 */
export interface SectionPracticesByTypeResponse {
  section_type: SectionType;
  practices: SectionPractice[];
  stats: {
    total_attempts: number;
    average_score: number | null;
    best_score: number | null;
    total_time_minutes: number;
  };
  pagination: PaginationInfo;
}

/**
 * Start practice response
 */
export interface StartPracticeResponse {
  message: string;
  attempt: SectionPracticeAttempt;
  practice: SectionPracticeDetail;
}

/**
 * Get attempt response
 */
export interface GetAttemptResponse {
  attempt: SectionPracticeAttempt;
  practice: SectionPracticeDetail;
}

/**
 * Submit answers request
 */
export interface SubmitAnswersRequest {
  answers: Record<string, string>;
  time_spent: number;
}

/**
 * Detailed result for a question
 */
export interface QuestionResult {
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
}

/**
 * Submit answers response
 */
export interface SubmitAnswersResponse {
  message: string;
  result: {
    score: number;
    correct_answers: number;
    total_questions: number;
    accuracy: number;
    time_spent_seconds: number;
    detailed_results: Record<string, QuestionResult>;
  };
}

/**
 * Submit writing request
 */
export interface SubmitWritingRequest {
  response: string;
  time_spent: number;
}

/**
 * Submit writing response
 */
export interface SubmitWritingResponse {
  message: string;
  attempt_uuid: string;
  status: string;
}

/**
 * Section type statistics
 */
export interface SectionStats {
  section_type: SectionType;
  total_practices: number;
  total_attempts: number;
  completed_attempts: number;
  average_score: number | null;
  best_score: number | null;
  total_time_spent: number;
}

/**
 * User stats response
 */
export interface UserStatsResponse {
  sections: SectionStats[];
  overall: {
    total_completed: number;
    average_score: number | null;
    total_time_minutes: number;
  };
}

/**
 * Section type overview item
 */
export interface SectionTypeOverview {
  section_type: SectionType;
  display_name: string;
  icon: string;
  color: string;
  total_practices: number;
  free_practices: number;
  completed_practices: number;
  total_attempts: number;
  best_score: number | null;
  progress_percentage: number;
}

/**
 * Active attempt check response
 */
export interface ActiveAttemptResponse {
  has_active: boolean;
  attempt?: SectionPracticeAttempt;
  practice?: SectionPractice;
}
