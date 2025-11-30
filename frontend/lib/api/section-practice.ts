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
  UserStatsResponse,
  SectionTypeOverview,
  ActiveAttemptResponse,
  SectionType,
  Difficulty,
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
 * Get section practices by type with stats
 */
export async function getSectionPracticesByType(
  sectionType: SectionType,
  difficulty?: Difficulty
): Promise<SectionPracticesByTypeResponse> {
  const searchParams = new URLSearchParams();
  if (difficulty) searchParams.append('difficulty', difficulty);
  
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
 */
export async function getSectionPracticeDetail(practiceId: number | string): Promise<SectionPracticeDetail> {
  const response = await apiClient.get<SectionPracticeDetail>(`${API_BASE}/practice/${practiceId}/`);
  if (!response.data) {
    throw new Error('Failed to fetch practice detail');
  }
  return response.data;
}

/**
 * Start a new practice attempt
 */
export async function startPractice(practiceId: number | string): Promise<StartPracticeResponse> {
  const response = await apiClient.post<StartPracticeResponse>(`${API_BASE}/practice/${practiceId}/start/`);
  if (!response.data) {
    throw new Error('Failed to start practice');
  }
  return response.data;
}

/**
 * Get attempt details
 */
export async function getAttempt(attemptId: number): Promise<GetAttemptResponse> {
  const response = await apiClient.get<GetAttemptResponse>(`${API_BASE}/practice/attempt/${attemptId}/`);
  if (!response.data) {
    throw new Error('Failed to fetch attempt');
  }
  return response.data;
}

/**
 * Submit answers for reading/listening practice
 */
export async function submitAnswers(
  attemptId: number,
  data: SubmitAnswersRequest
): Promise<SubmitAnswersResponse> {
  const response = await apiClient.post<SubmitAnswersResponse>(
    `${API_BASE}/practice/attempt/${attemptId}/submit/`,
    data
  );
  if (!response.data) {
    throw new Error('Failed to submit answers');
  }
  return response.data;
}

/**
 * Submit writing response
 */
export async function submitWriting(
  attemptId: number,
  data: SubmitWritingRequest
): Promise<SubmitWritingResponse> {
  const response = await apiClient.post<SubmitWritingResponse>(
    `${API_BASE}/practice/attempt/${attemptId}/submit-writing/`,
    data
  );
  if (!response.data) {
    throw new Error('Failed to submit writing');
  }
  return response.data;
}

/**
 * Abandon an in-progress attempt
 */
export async function abandonAttempt(attemptId: number): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>(`${API_BASE}/practice/attempt/${attemptId}/abandon/`);
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
