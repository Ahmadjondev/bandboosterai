/**
 * Exam Types for BandBooster
 * Based on Django models and API serializers
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export enum ExamType {
  LISTENING = "LISTENING",
  READING = "READING",
  WRITING = "WRITING",
  SPEAKING = "SPEAKING",
  LISTENING_READING = "LISTENING_READING",
  LISTENING_READING_WRITING = "LISTENING_READING_WRITING",
  FULL_TEST = "FULL_TEST",
}

export enum ExamStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  SUBMITTED = "SUBMITTED",
}

export enum SectionName {
  LISTENING = "listening",
  READING = "reading",
  WRITING = "writing",
  SPEAKING = "speaking",
}

export enum QuestionType {
  MCQ = "MCQ",
  MCMA = "MCMA",
  TFNG = "TFNG",
  YNNG = "YNNG",
  SA = "SA",
  FC = "FC",
  NC = "NC",
  SC = "SC",
  MH = "MH",
  MI = "MI",
  MF = "MF",
  SUC = "SUC",
  TC = "TC",
  FCC = "FCC",
  DL = "DL",
  ML = "ML",
}

export enum DifficultyLevel {
  BEGINNER = "BEGINNER",
  INTERMEDIATE = "INTERMEDIATE",
  ADVANCED = "ADVANCED",
}

// ============================================================================
// QUESTION & CHOICE TYPES
// ============================================================================

export interface Choice {
  id: number;
  key?: string; // Option key (A, B, C, etc.)
  choice_text: string;
  is_correct: boolean;
  order: number;
}

export interface Question {
  id: number;
  question_text: string;
  question_body?: Record<string, any>;
  question_data?: Record<string, any>;
  order: number;
  correct_answer_text?: string;
  choices: Choice[];
  options?: Choice[]; // Alias for choices (used in some question types)
  max_selections?: number | string; // For MCMA questions
  stem?: string; // Question stem (used in some question types)
  picture_url?: string; // For diagram/map labelling questions
  user_answer?: string;
  is_correct?: boolean;
}

export interface TestHead {
  id: number;
  title: string;
  description?: string;
  instruction?: string;
  question_type: QuestionType;
  word_limit?: number;
  max_selections?: number;
  order: number;
  questions: Question[];
}

// ============================================================================
// LISTENING TYPES
// ============================================================================

export interface ListeningPart {
  id: number;
  part_number: number;
  title: string;
  description?: string;
  audio_url: string;
  audio_duration?: number;
  transcript?: string;
  test_heads: TestHead[];
}

export interface ListeningSection {
  section_name: SectionName.LISTENING;
  time_remaining: number;
  next_section_name: SectionName | null;
  parts: ListeningPart[];
}

// ============================================================================
// READING TYPES
// ============================================================================

export interface ReadingPassage {
  id: number;
  passage_number: number;
  title: string;
  summary?: string;
  content: string;
  word_count?: number;
  test_heads: TestHead[];
}

export interface ReadingSection {
  section_name: SectionName.READING;
  time_remaining: number;
  next_section_name: SectionName | null;
  passages: ReadingPassage[];
}

// ============================================================================
// WRITING TYPES
// ============================================================================

export interface WritingTask {
  id: number;
  task_type: "TASK_1" | "TASK_2";
  task_type_display: string;
  prompt: string;
  picture?: string; // Full path to image
  picture_url?: string; // URL for image
  data?: any; // Additional task data
  min_words: number;
  user_attempt?: string | null; // User's saved answer
}

export interface WritingSection {
  section_name: SectionName.WRITING;
  time_remaining: number;
  next_section_name: SectionName | null;
  tasks: WritingTask[];
}

// ============================================================================
// SPEAKING TYPES
// ============================================================================

export interface SpeakingQuestion {
  question_key: string;
  question_text: string;
  preparation_time?: number;
  response_time: number;
}

export interface SpeakingPart {
  part_number: 1 | 2 | 3;
  title: string;
  description?: string;
  questions: SpeakingQuestion[];
}

export interface SpeakingTopic {
  id: number;
  topic: string;
  cue_card?: string;
  parts: SpeakingPart[];
}

export interface SpeakingSection {
  section_name: SectionName.SPEAKING;
  time_remaining: number;
  next_section_name: SectionName | null;
  topics: SpeakingTopic[];
}

// ============================================================================
// UNION TYPE FOR ALL SECTIONS
// ============================================================================

export type SectionData =
  | ListeningSection
  | ReadingSection
  | WritingSection
  | SpeakingSection;

// ============================================================================
// EXAM ATTEMPT TYPES
// ============================================================================

export interface ExamAttempt {
  id: number;
  exam_title: string;
  exam_type: ExamType;
  status: ExamStatus;
  current_section: SectionName | "NOT_STARTED" | "COMPLETED";
  started_at: string | null;
  completed_at: string | null;
  time_remaining: number;
  overall_score?: number;
  listening_score?: number;
  reading_score?: number;
  writing_score?: number;
  speaking_score?: number;
}

// ============================================================================
// TEST ATTEMPT HISTORY
// ============================================================================

export interface TestAttemptHistory {
  id: number;
  exam_id: number;
  exam_title: string;
  exam_type: ExamType;
  status: ExamStatus;
  current_section: SectionName | "NOT_STARTED" | "COMPLETED";
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  duration_minutes: number | null;
  listening_score: number | null;
  reading_score: number | null;
  writing_score: number | null;
  speaking_score: number | null;
  overall_score: number | null;
}

// ============================================================================
// ANSWER SUBMISSION TYPES
// ============================================================================

export interface AnswerSubmission {
  question_id: number;
  answer: string;
}

export interface WritingSubmission {
  task_id: number;
  task_type: 1 | 2;
  answer_text: string;
}

export interface SpeakingSubmission {
  question_key: string;
  audio_file: Blob;
}

// ============================================================================
// RESULTS TYPES
// ============================================================================

export interface QuestionResult {
  question_id: number;
  question_text: string;
  question_type: QuestionType;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  score?: number;
  max_score?: number;
}

export interface SectionResult {
  section_name: SectionName;
  score: number;
  max_score: number;
  percentage: number;
  band_score: number;
  questions: QuestionResult[];
}

export interface PerformanceAnalysis {
  strengths: {
    category: string;
    accuracy: number;
    description: string;
  }[];
  weaknesses: {
    category: string;
    accuracy: number;
    tips: string[];
  }[];
  recommendations: string[];
}

export interface ExamResult {
  attempt_id: number;
  exam_title: string;
  exam_type: ExamType;
  completed_at: string;
  overall_score: number;
  overall_band_score: number;
  listening?: SectionResult;
  reading?: SectionResult;
  writing?: {
    task1_score?: number;
    task2_score?: number;
    overall_score?: number;
    band_score?: number;
    feedback?: string;
  };
  speaking?: {
    overall_score?: number;
    band_score?: number;
    feedback?: string;
  };
  performance_analysis?: PerformanceAnalysis;
}

// ============================================================================
// PERMISSIONS & SYSTEM CHECK TYPES
// ============================================================================

export interface Permission {
  granted: boolean;
  checked: boolean;
  error: string | null;
}

export interface Permissions {
  microphone: Permission;
  camera: Permission;
  fullscreen: Permission;
}

export interface SystemCheck {
  browser: string;
  os: string;
  connection: "checking" | "good" | "poor" | "offline";
}

export interface AudioPreloading {
  isPreloading: boolean;
  progress: number;
  currentFile: string;
  totalFiles: number;
  loadedFiles: number;
  errors: Array<{ partNumber: number | string; error: string }>;
  preloadedAudios: Array<{
    partNumber: number;
    originalUrl: string;
    blobUrl: string;
    blob: Blob;
  }>;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  confirmClass: string;
  onConfirm: (() => void) | null;
  onCancel: (() => void) | null;
}

export interface FontSize {
  class: string;
  label: string;
}

export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  togglePlayback: () => void;
  seekAudio: (event: React.MouseEvent) => void;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface NextSectionResponse {
  success: boolean;
  current_section: SectionName | "COMPLETED";
  status: ExamStatus;
  message?: string;
}

export interface SubmitTestResponse {
  success: boolean;
  message: string;
  attempt_id: number;
}

// ============================================================================
// EXAM CONTEXT TYPES
// ============================================================================

export interface ExamContextType {
  attemptId: number;
  currentSection: SectionName;
  sectionData: SectionData | null;
  userAnswers: Record<number, string>;
  isLoading: boolean;
  error: string | null;
  timeRemaining: number;
  showInstructions: boolean;
  showPermissionsPage: boolean;
  showFullscreenWarning: boolean;
  showConfirmDialog: boolean;
  confirmDialogData: ConfirmDialogData;
  permissions: Permissions;
  systemCheck: SystemCheck;
  audioPreloading: AudioPreloading;
  isDarkTheme: boolean;
  
  // Methods
  loadSectionData: () => Promise<void>;
  startSection: () => void;
  submitAnswer: (questionId: number, answer: string, immediate?: boolean) => Promise<void>;
  submitWriting: (taskId: number, taskType: 1 | 2, answerText: string) => Promise<any>;
  submitSpeaking: (questionKey: string, audioBlob: Blob) => Promise<any>;
  handleNextSection: (skipConfirmation?: boolean) => Promise<void>;
  handleExit: () => Promise<void>;
  performSystemCheck: () => Promise<void>;
  checkMicrophonePermission: () => Promise<void>;
  proceedToInstructions: () => void;
  dismissFullscreenWarning: () => void;
  enterFullscreenFromWarning: () => void;
  toggleTheme: () => void;
}
