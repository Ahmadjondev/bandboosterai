/**
 * Reading Tests Type Definitions
 * Types for reading passages, test heads, and questions
 */

export type PassageNumber = 1 | 2 | 3;

export type QuestionType =
  | 'MCQ'
  | 'MCMA'
  | 'TFNG'
  | 'YNNG'
  | 'MH'
  | 'MI'
  | 'MF'
  | 'SUC'
  | 'NC'
  | 'FC'
  | 'TC'
  | 'FCC'
  | 'DL'
  | 'ML'
  | 'SA'
  | 'SC';

export interface QuestionTypeOption {
  code: QuestionType;
  label: string;
  icon: string;
  hasChoices: boolean;
}

export interface ReadingPassage {
  id: number;
  passage_number: PassageNumber;
  title: string;
  summary?: string;
  content: string;
  word_count?: number;
  test_heads?: TestHead[];
  created_at: string;
  updated_at: string;
}

export interface TestHead {
  id: number;
  title: string;
  description?: string;
  question_type: QuestionType;
  question_data?: string | object;
  reading?: number;
  listening_part?: number;
  question_count?: number;
  questions?: Question[];
  picture?: string;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id?: number | null;
  tempId?: string;
  question_text: string;
  correct_answer_text: string;
  answer_two_text?: string;
  explanation?: string;
  points: number;
  order: number;
  question_number?: number;
  choices?: QuestionChoice[];
}

export interface QuestionChoice {
  id?: number;
  choice_text: string;
  is_correct: boolean;
}

export interface PassageForm {
  passage_number: PassageNumber;
  title: string;
  summary: string;
  content: string;
}

export interface TestHeadForm {
  title: string;
  description: string;
  question_type: QuestionType;
  question_data?: string;
}

export interface PassageStats {
  totalPassages: number;
  totalQuestions: number;
  passage1Count: number;
  passage2Count: number;
  passage3Count: number;
}

export interface PaginationInfo {
  current_page: number;
  total_pages: number;
  total_items: number;
  per_page: number;
}

export interface PassagesResponse {
  passages: ReadingPassage[];
  pagination: PaginationInfo;
}

export interface TestHeadsResponse {
  testheads: TestHead[];
}

export interface TestHeadResponse {
  testhead: TestHead;
}

export interface PassageResponse {
  passage: ReadingPassage;
}

// Question Data structures for specialized question types

export interface MatchingOption {
  value: string;
  label: string;
  fullText: string;
}

export interface MatchingQuestionData {
  options: MatchingOption[];
  questions?: Question[];
}

export interface SummaryCompletionData {
  title?: string;
  text: string;
  blankCount: number;
  questions?: Question[];
}

export interface NoteCompletionData {
  title: string;
  items: string[];
  questions?: Question[];
}

export interface FormCompletionData {
  title: string;
  sections?: FormSection[];
  items: FormItem[];
  questions?: Question[];
}

export interface FormSection {
  title: string;
  items: FormItem[];
}

export interface FormItem {
  label: string;
  value?: string;
  subItems?: FormSubItem[];
}

export interface FormSubItem {
  label: string;
  value?: string;
}

export interface TableCompletionData {
  title: string;
  headers: string[];
  items: (string | string[])[][];
  questions?: Question[];
}

export interface DiagramLabelingData {
  title?: string;
  imageUrl?: string;
  labels: DiagramLabel[];
  questions?: Question[];
}

export interface DiagramLabel {
  id: string;
  x: number;
  y: number;
  number: number;
  answer?: string;
}

export interface MapLabelingData {
  title?: string;
  imageUrl?: string;
  labels: MapLabel[];
  questions?: Question[];
}

export interface MapLabel {
  id: string;
  x: number;
  y: number;
  number: number;
  answer?: string;
}

// Validation types

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Bulk create response

export interface BulkCreateResponse {
  created_count: number;
  error_count: number;
  errors: string[];
}

export interface UpdateResults {
  completed: number;
  total: number;
  errors: Array<{ questionId: number; error: string }>;
  updatedQuestions?: Question[];
}
