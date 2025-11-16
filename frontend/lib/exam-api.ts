/**
 * Exam API Client
 * Handles all API requests for IELTS exam functionality
 */

import { apiClient } from "./api-client";
import type {
  ExamAttempt,
  SectionData,
  SectionName,
  AnswerSubmission,
  WritingSubmission,
  SpeakingSubmission,
  NextSectionResponse,
  SubmitTestResponse,
  ExamResult,
  TestAttemptHistory,
} from "@/types/exam";

const API_BASE = "/exams/api";

// ============================================================================
// TEST ATTEMPT ENDPOINTS
// ============================================================================

/**
 * Check API connection
 */
export async function pingAPI(): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/ping/`, {
    method: "HEAD",
    credentials: "include",
  });
  return {
    success: response.ok,
    message: response.ok ? "Connected" : "Connection failed",
  };
}

/**
 * Get available mock exams
 * @param options - Optional parameters
 * @param options.random - If true, returns a single random test
 * @param options.examType - Filter by exam type (e.g., 'FULL_TEST')
 */
export async function getAvailableTests(options?: {
  random?: boolean;
  examType?: string;
}): Promise<any[]> {
  const params = new URLSearchParams();
  
  if (options?.random) {
    params.append('random', 'true');
  }
  
  if (options?.examType) {
    params.append('exam_type', options.examType);
  }
  
  const queryString = params.toString();
  const url = `${API_BASE}/tests/${queryString ? `?${queryString}` : ''}`;
  
  const response = await apiClient.get<any[]>(url);
  if (!response.data) {
    throw new Error("No data received from server");
  }
  return response.data;
}

/**
 * Check if user has an active exam attempt
 */
export async function checkActiveAttempt(): Promise<{
  has_active_attempt: boolean;
  active_attempt?: {
    attempt_id: number;
    exam_title: string;
    exam_type: string;
    status: string;
    current_section: string;
    started_at: string | null;
  };
}> {
  const response = await apiClient.get<{
    has_active_attempt: boolean;
    active_attempt?: {
      attempt_id: number;
      exam_title: string;
      exam_type: string;
      status: string;
      current_section: string;
      started_at: string | null;
    };
  }>(`${API_BASE}/active-attempt/`);
  
  if (!response.data) {
    throw new Error("No data received from server");
  }
  return response.data;
}

/**
 * Get basic information about a test attempt
 * @param attemptId - Attempt ID or UUID
 */
export async function getAttemptInfo(attemptId: number | string): Promise<ExamAttempt> {
  const response = await apiClient.get<ExamAttempt>(`${API_BASE}/attempt/${attemptId}/`);
  if (!response.data) {
    throw new Error("No data received from server");
  }
  return response.data;
}

/**
 * Create a new exam attempt for a Full IELTS Test
 * Calls the backend API to create an ExamAttempt and returns the attempt ID and UUID
 */
export async function createFullTestAttempt(examId: number): Promise<{ 
  attemptId: number;
  attemptUuid: string;
}> {
  const response = await apiClient.post<{ 
    attempt_id: number;
    attempt_uuid: string;
  }>(
    `${API_BASE}/tests/${examId}/start/`,
    {}
  );
  
  if (!response.data || !response.data.attempt_id) {
    throw new Error("Failed to create exam attempt");
  }
  
  return { 
    attemptId: response.data.attempt_id,
    attemptUuid: response.data.attempt_uuid
  };
}

// ============================================================================
// SECTION DATA ENDPOINTS
// ============================================================================

/**
 * Get data for a specific section (listening, reading, writing, speaking)
 * @param attemptId - Attempt ID or UUID
 */
export async function getSectionData(
  attemptId: number | string,
  section: SectionName
): Promise<SectionData> {
  const response = await apiClient.get<SectionData>(
    `${API_BASE}/attempt/${attemptId}/section/${section}/`
  );
  console.log(response.data + " <- Section Data");
  if (!response.data) {
    throw new Error("No section data received from server");
  }
  return response.data;
}

// ============================================================================
// ANSWER SUBMISSION ENDPOINTS
// ============================================================================

/**
 * Submit an answer for a question (listening/reading)
 * @param attemptId - Attempt ID or UUID
 */
export async function submitAnswer(
  attemptId: number | string,
  submission: AnswerSubmission
): Promise<{ success: boolean; message?: string }> {
  const response = await apiClient.post<{ success: boolean; message?: string }>(
    `${API_BASE}/attempt/${attemptId}/submit-answer/`,
    submission
  );
  return response.data || { success: false, message: "No response from server" };
}

/**
 * Submit a writing task answer
 * @param attemptId - Attempt ID or UUID
 */
export async function submitWriting(
  attemptId: number | string,
  submission: WritingSubmission
): Promise<{ success: boolean; message?: string }> {
  const response = await apiClient.post<{ success: boolean; message?: string }>(
    `${API_BASE}/attempt/${attemptId}/submit-writing/`,
    submission
  );
  return response.data || { success: false, message: "No response from server" };
}

/**
 * Submit a speaking response (audio file)
 * @param attemptId - Attempt ID or UUID
 */
export async function submitSpeaking(
  attemptId: number | string,
  submission: SpeakingSubmission
): Promise<{ success: boolean; message?: string }> {
  const formData = new FormData();
  formData.append("question_key", submission.question_key);
  formData.append("audio_file", submission.audio_file, `${submission.question_key}.webm`);

  const response = await apiClient.post<{ success: boolean; message?: string }>(
    `${API_BASE}/attempt/${attemptId}/submit-speaking/`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data || { success: false, message: "No response from server" };
}

// ============================================================================
// SECTION NAVIGATION ENDPOINTS
// ============================================================================

/**
 * Move to the next section
 * @param attemptId - Attempt ID or UUID
 */
export async function nextSection(attemptId: number | string): Promise<NextSectionResponse> {
  const response = await apiClient.post<NextSectionResponse>(
    `${API_BASE}/attempt/${attemptId}/next-section/`
  );
  if (!response.data) {
    throw new Error("No response received from server");
  }
  return response.data;
}

/**
 * Submit the entire test (final submission)
 * @param attemptId - Attempt ID or UUID
 */
export async function submitTest(attemptId: number | string): Promise<SubmitTestResponse> {
  const response = await apiClient.post<SubmitTestResponse>(
    `${API_BASE}/attempt/${attemptId}/submit/`
  );
  if (!response.data) {
    throw new Error("No response received from server");
  }
  return response.data;
}

// ============================================================================
// RESULTS ENDPOINTS
// ============================================================================

/**
 * Get test results after completion
 * @param attemptId - Attempt ID or UUID
 */
export async function getTestResults(attemptId: number | string): Promise<any> {
  const response = await apiClient.get<any>(
    `${API_BASE}/attempt/${attemptId}/results/`
  );
  if (!response.data) {
    throw new Error("No results data received from server");
  }
  return response.data;
}

/**
 * Get all test attempts for the current user
 */
export async function getMyAttempts(): Promise<TestAttemptHistory[]> {
  const response = await apiClient.get<{ attempts: TestAttemptHistory[] }>(
    `${API_BASE}/my-attempts/`
  );
  if (!response.data || !response.data.attempts) {
    throw new Error("No attempts data received from server");
  }
  return response.data.attempts;
}

// ============================================================================
// AUDIO PRELOADING HELPERS
// ============================================================================

/**
 * Preload audio files for listening section
 */
export async function preloadAudio(url: string): Promise<Blob> {
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to load audio: HTTP ${response.status}`);
  }

  return await response.blob();
}

/**
 * Create blob URL from preloaded audio
 */
export function createAudioBlobUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Revoke blob URL to free memory
 */
export function revokeAudioBlobUrl(blobUrl: string): void {
  URL.revokeObjectURL(blobUrl);
}

// ============================================================================
// DASHBOARD ENDPOINTS
// ============================================================================

export interface DashboardStats {
  overview: {
    total_tests: number;
    target_score: number;
    current_score: number | null;
    overall_progress: number;
    streak_days: number;
    tests_this_week: number;
  };
  section_stats: {
    listening: SectionStat;
    reading: SectionStat;
    writing: SectionStat;
    speaking: SectionStat;
  };
  recent_tests: RecentTest[];
}

export interface SectionStat {
  average_score: number | null;
  tests_count: number;
  progress: number;
}

export interface RecentTest {
  id: number;
  exam_name: string;
  exam_type: string;
  date: string;
  overall_score: number | null;
  listening_score: number | null;
  reading_score: number | null;
  writing_score: number | null;
  speaking_score: number | null;
}

/**
 * Get dashboard statistics including overview, section stats, and recent tests
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await apiClient.get<DashboardStats>(`${API_BASE}/dashboard/stats/`);
  if (!response.data) {
    throw new Error("Failed to fetch dashboard stats");
  }
  return response.data;
}
