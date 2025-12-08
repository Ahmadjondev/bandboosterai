/**
 * Practice API Client
 * API functions for section-by-section IELTS practice
 */

import { apiClient } from '../api-client';
import type {
  SectionPractice,
  SectionPracticeDetail,
  SectionPracticeAttempt,
  SectionPracticesByTypeResponse,
  StartPracticeResponse,
  GetAttemptResponse,
  SubmitAnswersRequest,
  SubmitAnswersResponse,
  SubmitWritingRequest,
  SubmitWritingResponse,
  WritingResultResponse,
  UserStatsResponse,
  SectionTypeOverview,
  ActiveAttemptResponse,
  SectionType,
  Difficulty,
  StatusFilter,
  WritingTaskType,
  ChartType,
} from '@/types/section-practice';

const API_BASE = '';

/**
 * Get all section practices
 */
export async function getSectionPractices(params?: {
  section_type?: SectionType;
  difficulty?: Difficulty;
  is_free?: boolean;
}): Promise<SectionPractice[]> {
  const searchParams = new URLSearchParams();
  if (params?.section_type) searchParams.append('section_type', params.section_type);
  if (params?.difficulty) searchParams.append('difficulty', params.difficulty);
  if (params?.is_free !== undefined) searchParams.append('is_free', String(params.is_free));
  
  const query = searchParams.toString();
  const url = `${API_BASE}/practice/${query ? `?${query}` : ''}`;
  
  const response = await apiClient.get<SectionPractice[]>(url);
  return response.data || [];
}

/**
 * Get section practices by type with stats and pagination
 */
export async function getSectionPracticesByType(
  sectionType: SectionType,
  options?: {
    difficulty?: Difficulty;
    status?: StatusFilter;
    search?: string;
    is_free?: boolean;
    page?: number;
    page_size?: number;
    // Writing-specific filters
    chart_type?: ChartType;
    task_type?: WritingTaskType;
    // Reading-specific filters
    passage_number?: string;
    // Listening-specific filters
    part_number?: string;
  }
): Promise<SectionPracticesByTypeResponse> {
  const searchParams = new URLSearchParams();
  if (options?.difficulty) searchParams.append('difficulty', options.difficulty);
  if (options?.status && options.status !== 'all') searchParams.append('status', options.status);
  if (options?.search) searchParams.append('search', options.search);
  if (options?.is_free !== undefined) searchParams.append('is_free', String(options.is_free));
  if (options?.page) searchParams.append('page', String(options.page));
  if (options?.page_size) searchParams.append('page_size', String(options.page_size));
  // Writing-specific filters
  if (options?.chart_type) searchParams.append('chart_type', options.chart_type);
  if (options?.task_type) searchParams.append('task_type', options.task_type);
  // Reading-specific filters
  if (options?.passage_number) searchParams.append('passage_number', options.passage_number);
  // Listening-specific filters
  if (options?.part_number) searchParams.append('part_number', options.part_number);
  
  const query = searchParams.toString();
  const url = `${API_BASE}/practice/sections/${sectionType.toLowerCase()}/${query ? `?${query}` : ''}`;
  
  const response = await apiClient.get<SectionPracticesByTypeResponse>(url);
  if (!response.data) {
    throw new Error('Failed to fetch section practices');
  }
  return response.data;
}

/**
 * Get section types overview
 */
export async function getSectionTypesOverview(): Promise<SectionTypeOverview[]> {
  const response = await apiClient.get<SectionTypeOverview[]>(`${API_BASE}/practice/overview/`);
  return response.data || [];
}

/**
 * Get section practice detail
 * @param practiceUuid - UUID of the section practice
 */
export async function getSectionPracticeDetail(practiceUuid: string): Promise<SectionPracticeDetail> {
  const response = await apiClient.get<SectionPracticeDetail>(`${API_BASE}/practice/${practiceUuid}/`);
  if (!response.data) {
    throw new Error('Failed to fetch practice detail');
  }
  return response.data;
}

/**
 * Start a new practice attempt
 * @param practiceUuid - UUID of the section practice
 */
export async function startPractice(practiceUuid: string): Promise<StartPracticeResponse> {
  const response = await apiClient.post<StartPracticeResponse>(`${API_BASE}/practice/${practiceUuid}/start/`);
  if (!response.data) {
    throw new Error('Failed to start practice');
  }
  return response.data;
}

/**
 * Get attempt details
 * @param attemptUuid - UUID of the attempt
 */
export async function getAttempt(attemptUuid: string): Promise<GetAttemptResponse> {
  const response = await apiClient.get<GetAttemptResponse>(`${API_BASE}/practice/attempt/${attemptUuid}/`);
  if (!response.data) {
    throw new Error('Failed to fetch attempt');
  }
  return response.data;
}

/**
 * Submit answers for reading/listening practice
 * @param attemptUuid - UUID of the attempt
 */
export async function submitAnswers(
  attemptUuid: string,
  data: SubmitAnswersRequest
): Promise<SubmitAnswersResponse> {
  const response = await apiClient.post<SubmitAnswersResponse>(
    `${API_BASE}/practice/attempt/${attemptUuid}/submit/`,
    data
  );
  if (!response.data) {
    throw new Error('Failed to submit answers');
  }
  return response.data;
}

/**
 * Submit writing response
 * @param attemptUuid - UUID of the attempt
 */
export async function submitWriting(
  attemptUuid: string,
  data: SubmitWritingRequest
): Promise<SubmitWritingResponse> {
  const response = await apiClient.post<SubmitWritingResponse>(
    `${API_BASE}/practice/attempt/${attemptUuid}/submit-writing/`,
    data
  );
  if (!response.data) {
    throw new Error('Failed to submit writing');
  }
  return response.data;
}

/**
 * Get writing practice result with AI evaluation
 * @param attemptUuid - UUID of the attempt
 */
export async function getWritingResult(attemptUuid: string): Promise<WritingResultResponse> {
  const response = await apiClient.get<WritingResultResponse>(
    `${API_BASE}/practice/attempt/${attemptUuid}/writing-result/`
  );
  if (!response.data) {
    throw new Error('Failed to fetch writing result');
  }
  return response.data;
}

/**
 * Submit a single speaking answer (audio recording)
 * @param attemptUuid - UUID of the attempt
 * @param questionKey - Question key (e.g., "speaking_PART_1_q1")
 * @param audioBlob - Audio blob from MediaRecorder
 */
export async function submitSpeakingAnswer(
  attemptUuid: string,
  questionKey: string,
  audioBlob: Blob
): Promise<{ success: boolean; message: string; question_key: string; file_url: string }> {
  const formData = new FormData();
  formData.append('question_key', questionKey);
  formData.append('audio_file', audioBlob, `${questionKey}.webm`);
  
  // NOTE: Do NOT set Content-Type header - browser sets it automatically with boundary
  const response = await apiClient.post<{ success: boolean; message: string; question_key: string; file_url: string }>(
    `${API_BASE}/practice/attempt/${attemptUuid}/submit-speaking-answer/`,
    formData
  );
  if (!response.data) {
    throw new Error('Failed to submit speaking answer');
  }
  return response.data;
}

/**
 * Complete speaking practice and trigger AI evaluation
 * @param attemptUuid - UUID of the attempt
 * @param timeSpent - Time spent in seconds
 */
export async function submitSpeakingComplete(
  attemptUuid: string,
  timeSpent: number
): Promise<SpeakingEvaluationResponse> {
  const response = await apiClient.post<SpeakingEvaluationResponse>(
    `${API_BASE}/practice/attempt/${attemptUuid}/submit-speaking-complete/`,
    { time_spent: timeSpent }
  );
  if (!response.data) {
    throw new Error('Failed to complete speaking practice');
  }
  return response.data;
}

/**
 * Get detailed speaking evaluation result
 * @param attemptUuid - UUID of the attempt
 */
export async function getSpeakingResult(attemptUuid: string): Promise<SpeakingResultResponse> {
  const response = await apiClient.get<SpeakingResultResponse>(
    `${API_BASE}/practice/attempt/${attemptUuid}/speaking-result/`
  );
  if (!response.data) {
    throw new Error('Failed to get speaking result');
  }
  return response.data;
}

// Speaking evaluation types
export interface SpeakingEvaluationResponse {
  success: boolean;
  message: string;
  attempt_uuid: string;
  score?: number;
  evaluation?: SpeakingEvaluation;
}

export interface SpeakingEvaluation {
  fluency_and_coherence: {
    score: number;
    feedback: string;
  };
  lexical_resource: {
    score: number;
    feedback: string;
  };
  grammatical_range_and_accuracy: {
    score: number;
    feedback: string;
  };
  pronunciation: {
    score: number;
    feedback: string;
  };
  overall_band_score: number;
  overall_feedback: string;
  strengths: string[];
  areas_for_improvement: string[];
  pronunciation_improvements?: {
    specific_words: string[];
    phonetic_tips: string[];
    practice_exercises: string[];
  };
}

export interface SpeakingResultResponse {
  success: boolean;
  attempt_uuid: string;
  practice_title: string;
  score: number | null;
  overall_feedback: string;
  evaluation: SpeakingEvaluation;
  azure_scores: {
    pronunciation: number;
    fluency: number;
    accuracy: number;
  };
  transcripts: Array<{
    question_key: string;
    question_text: string;
    transcript: string;
    pronunciation_score: number;
    fluency_score: number;
    accuracy_score: number;
    mispronounced_words: Array<{
      word: string;
      accuracy_score: number;
    }>;
  }>;
  time_spent_seconds: number;
  completed_at: string | null;
}

/**
 * Abandon an in-progress attempt
 * @param attemptUuid - UUID of the attempt
 */
export async function abandonAttempt(attemptUuid: string): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>(`${API_BASE}/practice/attempt/${attemptUuid}/abandon/`);
  return response.data || { message: 'Attempt abandoned' };
}

/**
 * Get user's attempts
 */
export async function getUserAttempts(params?: {
  section_type?: SectionType;
  status?: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  limit?: number;
}): Promise<SectionPracticeAttempt[]> {
  const searchParams = new URLSearchParams();
  if (params?.section_type) searchParams.append('section_type', params.section_type);
  if (params?.status) searchParams.append('status', params.status);
  if (params?.limit) searchParams.append('limit', String(params.limit));
  
  const query = searchParams.toString();
  const url = `${API_BASE}/practice/user/attempts/${query ? `?${query}` : ''}`;
  
  const response = await apiClient.get<SectionPracticeAttempt[]>(url);
  return response.data || [];
}

/**
 * Get user's section practice stats
 */
export async function getUserStats(): Promise<UserStatsResponse> {
  const response = await apiClient.get<UserStatsResponse>(`${API_BASE}/practice/user/stats/`);
  if (!response.data) {
    throw new Error('Failed to fetch user stats');
  }
  return response.data;
}

/**
 * Check for active (in-progress) attempt
 */
export async function getActiveAttempt(): Promise<ActiveAttemptResponse> {
  const response = await apiClient.get<ActiveAttemptResponse>(`${API_BASE}/practice/user/active-attempt/`);
  if (!response.data) {
    return { has_active: false };
  }
  return response.data;
}

/**
 * Helper function to get section icon
 */
export function getSectionIcon(sectionType: SectionType): string {
  const icons: Record<SectionType, string> = {
    LISTENING: '🎧',
    READING: '📖',
    WRITING: '✍️',
    SPEAKING: '🎤',
  };
  return icons[sectionType] || '📝';
}

/**
 * Check if user can access a specific practice section (premium check)
 * @param practiceUuid - UUID of the section practice
 */
export interface PracticeAccessResponse {
  has_access: boolean;
  requires_payment: boolean;
  attempts_remaining: number; // -1 for unlimited
  is_free: boolean;
  is_unlimited?: boolean;
  reason: string;
  practice_uuid: string;
  practice_title: string;
  section_type: SectionType;
}

export async function checkPracticeAccess(practiceUuid: string): Promise<PracticeAccessResponse> {
  const response = await apiClient.get<PracticeAccessResponse>(
    `${API_BASE}/practice/${practiceUuid}/check-access/`
  );
  if (!response.data) {
    throw new Error('Failed to check practice access');
  }
  return response.data;
}

/**
 * Get user's current attempt balances for all section types
 */
export interface UserAttemptBalances {
  reading: { balance: number; is_unlimited: boolean };
  listening: { balance: number; is_unlimited: boolean };
  writing: { balance: number; is_unlimited: boolean };
  speaking: { balance: number; is_unlimited: boolean };
  has_subscription: boolean;
  subscription_plan: string | null;
}

export async function getUserAttemptBalances(): Promise<UserAttemptBalances> {
  const response = await apiClient.get<UserAttemptBalances>(
    `${API_BASE}/practice/user/attempt-balance/`
  );
  if (!response.data) {
    throw new Error('Failed to fetch user attempt balances');
  }
  return response.data;
}

/**
 * Get user's attempt balance for a specific section type
 */
export interface SectionAttemptBalance {
  section_type: SectionType;
  balance: number; // Maps from attempts_remaining
  is_unlimited: boolean;
  has_subscription: boolean; // Maps from is_subscription
  has_access: boolean;
  reason: string;
}

export async function getSectionAttemptBalance(sectionType: SectionType): Promise<SectionAttemptBalance> {
  const response = await apiClient.get<{
    section_type: string;
    attempts_remaining: number;
    is_unlimited: boolean;
    is_subscription: boolean;
    has_access: boolean;
    reason: string;
  }>(
    `${API_BASE}/practice/user/attempt-balance/${sectionType.toLowerCase()}/`
  );
  if (!response.data) {
    throw new Error('Failed to fetch section attempt balance');
  }
  
  // Map the backend response to frontend expected format
  return {
    section_type: response.data.section_type as SectionType,
    balance: response.data.attempts_remaining,
    is_unlimited: response.data.is_unlimited,
    has_subscription: response.data.is_subscription,
    has_access: response.data.has_access,
    reason: response.data.reason,
  };
}

/**
 * Helper function to get section color
 */
export function getSectionColor(sectionType: SectionType): string {
  const colors: Record<SectionType, string> = {
    LISTENING: 'blue',
    READING: 'green',
    WRITING: 'purple',
    SPEAKING: 'orange',
  };
  return colors[sectionType] || 'gray';
}

/**
 * Helper function to format time
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Helper function to get difficulty badge color
 */
export function getDifficultyColor(difficulty: string): string {
  const colors: Record<string, string> = {
    EASY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    HARD: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    EXPERT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };
  return colors[difficulty] || 'bg-gray-100 text-gray-800';
}
