/**
 * Results Types for BandBooster
 * Defines TypeScript interfaces for exam results and band scores
 */

import { ExamType, SectionName } from "./exam";

// ============================================================================
// ANSWER DETAIL TYPES
// ============================================================================

export interface AnswerDetail {
  question_number: number;
  question_text: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  is_mcma: boolean;
  mcma_score?: string; // e.g., "2/3"
  mcma_breakdown?: string[]; // e.g., ["✓ A (Correct - selected)", "✗ B (Correct - not selected)"]
}

export interface AnswerGroup {
  id: number;
  title: string;
  test_head: string;
  answers: AnswerDetail[];
}

// ============================================================================
// TYPE STATISTICS
// ============================================================================

export interface TypeStats {
  correct: number;
  total: number;
}

export interface AccuracyByType {
  [questionType: string]: number; // 0.0 to 1.0
}

export interface PartStats {
  [partLabel: string]: TypeStats; // e.g., "Part 1": {correct: 5, total: 10}
}

export interface AccuracyByPart {
  [partLabel: string]: number; // 0.0 to 1.0
}

// ============================================================================
// LISTENING SECTION RESULTS
// ============================================================================

export interface ListeningResults {
  total_questions: number;
  correct_answers: number;
  band_score: number;
  accuracy_by_type: AccuracyByType;
  accuracy_by_part: AccuracyByPart;
  type_stats: { [key: string]: TypeStats };
  part_stats: PartStats;
  answer_groups: AnswerGroup[];
}

// ============================================================================
// READING SECTION RESULTS
// ============================================================================

export interface ReadingResults {
  total_questions: number;
  correct_answers: number;
  band_score: number;
  accuracy_by_type: AccuracyByType;
  type_stats: { [key: string]: TypeStats };
  answer_groups: AnswerGroup[];
}

// ============================================================================
// WRITING SECTION RESULTS
// ============================================================================

export interface WritingCriteria {
  task_response_or_achievement: number | null;
  coherence_and_cohesion: number | null;
  lexical_resource: number | null;
  grammatical_range_and_accuracy: number | null;
}

export interface WritingFeedback {
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  [key: string]: any;
}

export interface WritingTaskResult {
  id: number; // WritingAttempt ID
  task_type: string; // "Task 1" or "Task 2"
  word_count: number;
  evaluation_status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  user_answer: string;
  band_score: number | null;
  band: number | null;
  feedback: WritingFeedback;
  criteria: WritingCriteria;
}

export interface WritingResults {
  tasks: WritingTaskResult[];
  overall_band_score: number | null;
}

// ============================================================================
// SPEAKING SECTION RESULTS
// ============================================================================

export interface SpeakingCriteria {
  fluency_and_coherence: number | null;
  lexical_resource: number | null;
  grammatical_range_and_accuracy: number | null;
  pronunciation: number | null;
}

export interface SpeakingPartResult {
  speaking_type: string; // "PART_1", "PART_2", "PART_3"
  part_display: string; // "Part 1", "Part 2", "Part 3"
  topic: string;
  evaluation_status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  has_audio?: boolean;
}

export interface SpeakingResults {
  parts: SpeakingPartResult[];
  overall_band_score: number | null;
  criteria: SpeakingCriteria;
  feedback: WritingFeedback; // Same structure as writing feedback
}

// ============================================================================
// INSIGHTS & ANALYSIS
// ============================================================================

export interface StrengthItem {
  area?: string; // Used in API response
  category?: string; // Alternative field name
  accuracy: number;
  tip: string;
}

export interface WeaknessItem {
  area?: string; // Used in API response
  category?: string; // Alternative field name
  accuracy: number;
  tip: string;
}

export interface Insights {
  strengths: StrengthItem[];
  weaknesses: WeaknessItem[];
}

// ============================================================================
// MAIN RESULTS RESPONSE
// ============================================================================

export interface TestResults {
  attempt_id: number;
  exam_title: string;
  exam_type: ExamType;
  completed_at: string;
  duration_minutes: number;
  sections: {
    listening?: ListeningResults;
    reading?: ReadingResults;
    writing?: WritingResults;
    speaking?: SpeakingResults;
  };
  insights?: Insights;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface ResultsPageState {
  results: TestResults | null;
  isLoading: boolean;
  error: string | null;
  activeSection: SectionName | null;
  showAnswerDetails: boolean;
  selectedAnswerGroup: AnswerGroup | null;
}
