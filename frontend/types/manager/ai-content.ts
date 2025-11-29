/**
 * TypeScript types for AI Content Generation
 * Matches the backend API response structure from manager_panel/ai_api.py
 */

export type ContentType = 'auto' | 'reading' | 'listening' | 'writing' | 'speaking' | 'full_test';

export type QuestionType =
  | 'MCQ'           // Multiple Choice
  | 'MCMA'          // Multiple Choice Multiple Answers
  | 'SA'            // Short Answer
  | 'SC'            // Sentence Completion
  | 'TFNG'          // True/False/Not Given
  | 'YNNG'          // Yes/No/Not Given
  | 'MF'            // Matching Features
  | 'MI'            // Matching Information
  | 'MH'            // Matching Headings
  | 'SUC'           // Summary Completion
  | 'NC'            // Note Completion
  | 'FC'            // Form Completion
  | 'TC'            // Table Completion
  | 'FCC'           // Flow Chart Completion
  | 'DL'            // Diagram Labeling
  | 'ML';           // Map Labeling

// Base question structure
export interface AIQuestion {
  order: number;
  text: string;
  correct_answer: string;
  options?: string[];
}

// Question group structure
export interface QuestionGroup {
  title: string;
  description?: string;
  question_type: QuestionType;
  questions: AIQuestion[];
  image?: File | string | null;  // For diagram, map, flow chart types
  image_preview?: string;  // Preview URL for uploaded image
}

// Reading Passage structure
export interface ReadingPassage {
  passage_number: number;
  title: string;
  summary: string;
  content: string;
  question_groups: QuestionGroup[];
}

// Listening Part structure
export interface ListeningPart {
  part_number: number;
  title: string;
  description: string;
  audio_transcript?: string;
  question_groups: QuestionGroup[];
}

// Writing Task structure
export interface WritingTask {
  task_type: 'TASK_1' | 'TASK_2';
  prompt: string;
  min_words: number;
  has_visual: boolean;
  visual_description?: string;
  data?: {
    chart_type?: string;
    time_period?: string;
    question_type?: string;
    topic?: string;
  };
}

// Speaking Topic structure
export interface SpeakingTopic {
  part_number: 1 | 2 | 3;
  topic: string;
  questions?: string[];
  cue_card?: {
    main_prompt: string;
    bullet_points: string[];
    preparation_time?: string;
    speaking_time?: string;
  };
}

// AI Response structure
export interface AIGenerateResponse {
  success: boolean;
  content_type: ContentType;
  passages?: ReadingPassage[];
  parts?: ListeningPart[];
  tasks?: WritingTask[];
  topics?: SpeakingTopic[];
  error?: string;
}

// API response wrapper
export interface AIGenerateAPIResponse {
  success: boolean;
  content_type: ContentType;
  data: AIGenerateResponse;
  message?: string;
  error?: string;
}

// Save response
export interface AISaveResponse {
  success: boolean;
  message: string;
  passages?: Array<{ id: number; title: string }>;
  parts?: Array<{ id: number; title: string }>;
  tasks?: Array<{ id: number; title: string }>;
  topics?: Array<{ id: number; topic: string }>;
  error?: string;
}

// Upload mode
export type UploadMode = 'pdf' | 'json' | 'full_book';

// Notification
export interface Notification {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

// Content type option
export interface ContentTypeOption {
  value: ContentType;
  label: string;
  icon: string;
}

// Step structure
export interface Step {
  number: number;
  title: string;
  icon: string;
}

// Speaking topic group (for display)
export interface SpeakingTopicGroup {
  part1?: SpeakingTopic;
  part2?: SpeakingTopic;
  part3?: SpeakingTopic;
}

// ============ Full Test Types (Cambridge IELTS Book Upload) ============

// Book info from full test extraction
export interface BookInfo {
  title: string;
  total_tests: number;
  extracted_tests: number;
}

// Full test structure containing all sections
export interface FullTest {
  test_number: number;
  test_name: string;
  listening: {
    parts: ListeningPart[];
  };
  reading: {
    passages: ReadingPassage[];
  };
  writing: {
    tasks: WritingTask[];
  };
  speaking: {
    topics: SpeakingTopic[];
  };
}

// Full test extraction response
export interface FullTestExtractionResponse {
  success: boolean;
  content_type: 'full_test';
  book_info: BookInfo;
  tests: FullTest[];
  partial?: boolean;
  extracted_sections?: string[];
  missing_sections?: string[];
  metadata?: {
    total_listening_parts: number;
    total_reading_passages: number;
    total_writing_tasks: number;
    total_speaking_parts: number;
    total_questions: number;
    has_answer_key: boolean;
    extraction_quality: 'high' | 'medium' | 'low';
  };
  error?: string;
}

// Full test save response
export interface FullTestSaveResponse {
  success: boolean;
  message: string;
  results: {
    listening: AISaveResponse | null;
    reading: AISaveResponse | null;
    writing: AISaveResponse | null;
    speaking: AISaveResponse | null;
  };
  saved_sections: string[];
  error?: string;
}

// Audio file mapping for batch upload
export interface AudioFileMapping {
  file: File;
  partIndex: number;
  testIndex?: number;
  preview?: string;
}

// Batch audio upload response
export interface BatchAudioUploadResponse {
  success: boolean;
  uploaded: Array<{
    key: string;
    filename: string;
    url: string;
    size: number;
  }>;
  errors: Array<{
    key: string;
    filename: string;
    error: string;
  }>;
  message: string;
}
