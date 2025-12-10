/**
 * Question Builder Types
 * Type definitions for the QuestionBuilder component and related builders
 */

import type { Question, QuestionType, QuestionChoice, TestHead } from '@/types/reading';

/**
 * Question type option with metadata
 */
export interface QuestionTypeOption {
  code: QuestionType;
  label: string;
  icon: string;
  hasChoices: boolean;
  description?: string;
}

/**
 * Question group (TestHead) form data
 */
export interface QuestionGroupForm {
  id: number | null;
  title: string;
  description: string;
  question_type: QuestionType;
  question_data: string;
  reading?: number | null;
  listening_part?: number | null;
  picture?: string | null;
  diagramImageFile?: File | null;
  mapImageFile?: File | null;
}

/**
 * Builder step configuration
 */
export interface BuilderStep {
  number: number;
  label: string;
  description: string;
}

/**
 * Matching option for MF/MI/MH question types
 */
export interface MatchingOption {
  value: string;
  label: string;
  fullText: string;
}

/**
 * Summary completion data structure
 */
export interface SummaryCompletionData {
  title: string;
  text: string;
  blankCount: number;
  questions?: Question[];
}

/**
 * Note/Form completion data structure
 */
export interface NoteCompletionData {
  title: string;
  items: NoteItem[];
  questions?: Question[];
}

/**
 * Note item in note/form completion
 */
export interface NoteItem {
  label: string;
  value: string;
  hasBlank: boolean;
  blankNumber?: number;
}

/**
 * Table completion data structure
 */
export interface TableCompletionData {
  title: string;
  headers: string[];
  rows: TableRow[];
  questions?: Question[];
}

/**
 * Table row in table completion
 */
export interface TableRow {
  cells: TableCell[];
}

/**
 * Table cell in table completion
 */
export interface TableCell {
  content: string;
  hasBlank: boolean;
  blankNumber?: number;
}

/**
 * Diagram/Map labeling data structure
 */
export interface DiagramLabelingData {
  title: string;
  imageUrl?: string;
  labels: DiagramLabel[];
  questions?: Question[];
}

/**
 * Label in diagram/map labeling
 */
export interface DiagramLabel {
  number: number;
  x: number;
  y: number;
  answer: string;
}

/**
 * Bulk create request body
 */
export interface BulkCreateRequestBody {
  testhead: number;
  questions?: Array<{
    question_text: string;
    correct_answer_text: string;
    answer_two_text?: string;
    order: number;
    choices?: Array<{
      choice_text: string;
      is_correct: boolean;
    }>;
  }>;
  matching_data?: {
    options?: MatchingOption[];
    questions?: Array<{
      question_text: string;
      correct_answer_text: string;
      order: number;
    }>;
    title?: string;
    text?: string;
    blankCount?: number;
    items?: NoteItem[];
  };
}

/**
 * Bulk create response
 */
export interface BulkCreateResponse {
  created_count: number;
  error_count: number;
  errors: string[];
  questions?: Question[];
}

/**
 * Update result for tracking question updates
 */
export interface UpdateResult {
  total: number;
  completed: number;
  errors: Array<{
    questionId: number;
    error: string;
  }>;
  updatedQuestions: Question[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Question builder state
 */
export interface QuestionBuilderState {
  currentStep: number;
  totalSteps: number;
  questionGroup: QuestionGroupForm;
  questions: Question[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  previewMode: boolean;
  editingQuestionIndex: number | null;
  showBuilder: boolean;
}

/**
 * Question builder context for providers
 */
export interface QuestionBuilderContextValue extends QuestionBuilderState {
  goToStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  setQuestionGroup: (group: Partial<QuestionGroupForm>) => void;
  addQuestion: (question: Question) => void;
  updateQuestion: (index: number, question: Question) => void;
  removeQuestion: (index: number) => void;
  moveQuestionUp: (index: number) => void;
  moveQuestionDown: (index: number) => void;
  duplicateQuestion: (index: number) => void;
  clearAllQuestions: () => void;
  setEditingQuestionIndex: (index: number | null) => void;
  togglePreview: () => void;
  toggleBuilder: () => void;
  saveAll: () => Promise<void>;
  cancel: () => void;
  resetForm: () => void;
}

/**
 * Props for specialized builders
 */
export interface BuilderBaseProps {
  questionType?: QuestionType;
  existingQuestions?: Question[];
  onQuestionsReady: (questions: Question[]) => void;
  onCancel: () => void;
}

export interface MatchingBuilderProps extends BuilderBaseProps {
  matchingOptions?: string;
  onUpdateMatchingOptions: (options: string) => void;
}

export interface SummaryBuilderProps extends BuilderBaseProps {
  summaryData?: string;
  onUpdateSummaryData: (data: string) => void;
}

export interface NoteBuilderProps extends BuilderBaseProps {
  noteData?: string;
  onUpdateNoteData: (data: string) => void;
}

export interface DiagramBuilderProps extends BuilderBaseProps {
  diagramData?: string;
  existingImageUrl?: string;
  onUpdateDiagramData: (data: string) => void;
  onUpdateDiagramImage: (file: File | null) => void;
}

export interface TableBuilderProps {
  initialData?: {
    question_data: string;
    questions: Question[];
  };
  isEditMode?: boolean;
  onQuestionsReady: (data: { questions: Question[]; question_data: string; isModified: boolean }) => void;
}

/**
 * Question type constants
 */
export const QUESTION_TYPES: QuestionTypeOption[] = [
  { code: 'MCQ', label: 'Multiple Choice', icon: 'List', hasChoices: true },
  { code: 'MCMA', label: 'Multiple Choice (Multiple Answers)', icon: 'CheckSquare', hasChoices: true },
  { code: 'TFNG', label: 'True/False/Not Given', icon: 'CheckCircle', hasChoices: false },
  { code: 'YNNG', label: 'Yes/No/Not Given', icon: 'HelpCircle', hasChoices: false },
  { code: 'MF', label: 'Matching Features', icon: 'Link', hasChoices: false },
  { code: 'MI', label: 'Matching Information', icon: 'Link2', hasChoices: false },
  { code: 'MH', label: 'Matching Headings', icon: 'AlignLeft', hasChoices: false },
  { code: 'SC', label: 'Sentence Completion', icon: 'Edit3', hasChoices: false },
  { code: 'SA', label: 'Short Answer', icon: 'MessageSquare', hasChoices: false },
  { code: 'SUC', label: 'Summary Completion', icon: 'FileText', hasChoices: false },
  { code: 'NC', label: 'Note Completion', icon: 'Book', hasChoices: false },
  { code: 'FC', label: 'Form Completion', icon: 'Clipboard', hasChoices: false },
  { code: 'TC', label: 'Table Completion', icon: 'Grid', hasChoices: false },
  { code: 'DL', label: 'Diagram Labeling', icon: 'Image', hasChoices: false },
  { code: 'ML', label: 'Map Labeling', icon: 'Map', hasChoices: false },
];

/**
 * Get question type option by code
 */
export function getQuestionTypeOption(code: QuestionType): QuestionTypeOption | undefined {
  return QUESTION_TYPES.find((t) => t.code === code);
}

/**
 * Check if question type uses specialized builder
 */
export function isSpecializedBuilderType(code: QuestionType): boolean {
  return ['TFNG', 'YNNG', 'MF', 'MI', 'MH', 'SUC', 'NC', 'FC', 'TC', 'DL', 'ML'].includes(code);
}

/**
 * Check if question type is a matching type
 */
export function isMatchingType(code: QuestionType): boolean {
  return ['MF', 'MI', 'MH'].includes(code);
}

/**
 * Check if question type is T/F/NG type
 */
export function isTFNGType(code: QuestionType): boolean {
  return ['TFNG', 'YNNG'].includes(code);
}

/**
 * Check if question type is a completion type
 */
export function isCompletionType(code: QuestionType): boolean {
  return ['SUC', 'NC', 'FC', 'TC'].includes(code);
}

/**
 * Check if question type is a labeling type
 */
export function isLabelingType(code: QuestionType): boolean {
  return ['DL', 'ML'].includes(code);
}
