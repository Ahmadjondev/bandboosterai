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
 * @deprecated No longer used - connection check removed from frontend
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
  
  // API may return a plain object for a single random test. Use generic `any`
  // and normalize to an array below.
  const response = await apiClient.get<any>(url);
  if (!response.data) {
    throw new Error("No data received from server");
  }
  
  // Normalize the response: if we requested `random` and backend returned an
  // object, wrap it in an array. Otherwise, return the array as-is.
  if (options?.random) {
    if (!Array.isArray(response.data)) {
      return [response.data];
    }
    return response.data;
  }

  if (Array.isArray(response.data)) return response.data;

  return [response.data];
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
 * @param examIdentifier - Exam ID (number) or UUID (string)
 */
export async function createFullTestAttempt(examIdentifier: number | string): Promise<{ 
  attemptId: number;
  attemptUuid: string;
}> {
  const response = await apiClient.post<{ 
    attempt_id: number;
    attempt_uuid: string;
  }>(
    `${API_BASE}/tests/${examIdentifier}/start/`,
    {}
  );
  
  if (!response.data || !response.data.attempt_id) {
    throw new Error("Failed to create exam attempt");
  }
  console.log("Create attempt response:", response.data);
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
  const url = `${API_BASE}/attempt/${attemptId}/section/${section}/`;
  console.log('[getSectionData] Fetching:', url);
  
  const response = await apiClient.get<SectionData>(url);
  
  console.log('[getSectionData] Response:', response.data);
  
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

  console.log('[submitSpeaking] Submitting:', {
    attemptId,
    question_key: submission.question_key,
    audio_size: submission.audio_file.size,
    audio_type: submission.audio_file.type
  });

  // Don't set Content-Type header - let the browser set it automatically with boundary
  const response = await apiClient.post<{ success: boolean; message?: string }>(
    `${API_BASE}/attempt/${attemptId}/submit-speaking/`,
    formData
  );
  
  console.log('[submitSpeaking] Response:', response.data);
  
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
// SPEAKING DEFAULT AUDIOS
// ============================================================================

export interface SpeakingDefaultAudioInfo {
  audio_url: string;
  script: string;
  label: string;
}

export interface SpeakingDefaultAudios {
  PART_1_INTRO?: SpeakingDefaultAudioInfo;
  PART_2_INTRO?: SpeakingDefaultAudioInfo;
  PART_2_PREP?: SpeakingDefaultAudioInfo;
  PART_2_START?: SpeakingDefaultAudioInfo;
  PART_3_INTRO?: SpeakingDefaultAudioInfo;
  TEST_END?: SpeakingDefaultAudioInfo;
}

/**
 * Get default speaking audios for the exam
 * These are intro/instruction audios that play before each part
 */
export async function getSpeakingDefaultAudios(): Promise<SpeakingDefaultAudios> {
  const response = await apiClient.get<{ success: boolean; audios: SpeakingDefaultAudios }>(
    `${API_BASE}/speaking/default-audios/`
  );
  if (!response.data || !response.data.audios) {
    return {};
  }
  return response.data.audios;
}

// ============================================================================
// AUDIO PRELOADING HELPERS
// ============================================================================

/**
 * Preload audio files for listening section
 * Note: No credentials needed for public S3 assets
 */
export async function preloadAudio(url: string): Promise<Blob> {
  const response = await fetch(url, {
    // Don't send credentials - S3 audio files are public assets
    // credentials: "include" would fail CORS with wildcard Access-Control-Allow-Origin
    credentials: "omit",
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

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
}

export interface WeeklyData {
  week_start: string;
  week_end: string;
  tests_completed: number;
  average_score: number | null;
}

export interface WeeklyProgress {
  weekly_data: WeeklyData[];
  trend: "improving" | "stable" | "declining";
}

export interface Recommendation {
  type: "focus_area" | "general";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  action: string;
}

export interface PerformanceInsights {
  strongest_section: string | null;
  improvement_needed: string | null;
  total_study_time: number;
  consistency_score: number;
}

export interface ScoreHistoryItem {
  date: string;
  scores: {
    listening: number | null;
    reading: number | null;
    writing: number | null;
    speaking: number | null;
  };
  overall: number | null;
  test_name: string;
}

export interface LearningVelocity {
  velocity: number;
  trend: "improving" | "declining" | "stable" | "insufficient_data";
  improvement_rate: number;
  recent_avg?: number;
  previous_avg?: number;
}

export interface ActivityHeatmapDay {
  date: string;
  count: number;
  level: number;
}

export interface ActivityHeatmap {
  data: ActivityHeatmapDay[];
  total_active_days: number;
  most_active_day: string | null;
  current_streak: number;
}

export interface MotivationalMessage {
  type: "streak" | "achievement" | "encouragement" | "milestone" | "welcome";
  title: string;
  message: string;
  color: string;
}

export interface SkillGap {
  section: string;
  current_score: number;
  target_score: number;
  gap: number;
  priority: "high" | "medium" | "low";
  estimated_practice_needed: number;
}

export interface QuickStats {
  best_score: number;
  average_improvement: number;
  practice_consistency: number;
  tests_this_month: number;
}

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
  achievements: Achievement[];
  weekly_progress: WeeklyProgress;
  recommendations: Recommendation[];
  performance_insights: PerformanceInsights;
  score_history: ScoreHistoryItem[];
  learning_velocity: LearningVelocity;
  activity_heatmap: ActivityHeatmap;
  motivational_message: MotivationalMessage;
  skill_gaps: SkillGap[];
  quick_stats: QuickStats;
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
 * Get dashboard statistics including overview, section stats, recent tests,
 * achievements, weekly progress, recommendations, and performance insights
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await apiClient.get<DashboardStats>(`${API_BASE}/dashboard/stats/`);
  if (!response.data) {
    throw new Error("Failed to fetch dashboard stats");
  }
  return response.data;
}

/**
 * Clear dashboard cache to force refresh of statistics
 */
export async function clearDashboardCache(): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    `${API_BASE}/dashboard/clear-cache/`
  );
  if (!response.data) {
    throw new Error("Failed to clear dashboard cache");
  }
  return response.data;
}

// ============= Dashboard V2 API (Optimized parallel endpoints) =============

export interface DashboardOverviewV2 {
  total_tests: number;
  tests_this_week: number;
  tests_this_month: number;
  streak_days: number;
  target_score: number;
  books: {
    started: number;
    completed: number;
    sections_completed: number;
    average_score: number;
  };
  last_activity: string | null;
}

export interface DashboardSectionsV2 {
  listening: {
    average_score: number | null;
    tests_count: number;
    best_score: number | null;
    progress: number;
  };
  reading: {
    average_score: number | null;
    tests_count: number;
    best_score: number | null;
    progress: number;
  };
  writing: {
    average_score: number | null;
    tests_count: number;
    best_score: number | null;
    progress: number;
  };
  speaking: {
    average_score: number | null;
    tests_count: number;
    best_score: number | null;
    progress: number;
  };
  target_score: number;
  overall_average: number | null;
}

export interface BookProgress {
  id: number;
  title: string;
  cover_image: string | null;
  level: string;
  total_sections: number;
  completed_sections: number;
  percentage: number;
  average_score: number | null;
  is_completed: boolean;
  last_accessed: string;
}

export interface DashboardBooksV2 {
  in_progress: BookProgress[];
  suggested: Array<{
    id: number;
    title: string;
    cover_image: string | null;
    level: string;
    total_sections: number;
  }>;
  recent_activity: Array<{
    section_title: string;
    book_title: string;
    score: number | null;
    completed_at: string;
    section_type: string;
  }>;
  stats: {
    total_started: number;
    total_completed: number;
  };
}

export interface DashboardActivityV2 {
  recent_tests: Array<{
    id: number;
    exam_name: string;
    exam_type: string;
    date: string;
    listening_score: number | null;
    reading_score: number | null;
    overall_score: number | null;
  }>;
}

export interface DashboardWeeklyV2 {
  weekly_progress: Array<{
    week: string;
    tests: number;
  }>;
}

export interface DashboardAchievementV2 {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number;
}

/**
 * Dashboard V2 - Get overview stats (fast endpoint)
 */
export async function getDashboardOverviewV2(): Promise<DashboardOverviewV2> {
  const response = await apiClient.get<DashboardOverviewV2>(`${API_BASE}/dashboard/v2/overview/`);
  if (!response.data) throw new Error("Failed to fetch dashboard overview");
  return response.data;
}

/**
 * Dashboard V2 - Get section scores
 */
export async function getDashboardSectionsV2(): Promise<DashboardSectionsV2> {
  const response = await apiClient.get<DashboardSectionsV2>(`${API_BASE}/dashboard/v2/sections/`);
  if (!response.data) throw new Error("Failed to fetch section scores");
  return response.data;
}

/**
 * Dashboard V2 - Get books progress
 */
export async function getDashboardBooksV2(): Promise<DashboardBooksV2> {
  const response = await apiClient.get<DashboardBooksV2>(`${API_BASE}/dashboard/v2/books/`);
  if (!response.data) throw new Error("Failed to fetch books progress");
  return response.data;
}

/**
 * Dashboard V2 - Get recent activity
 */
export async function getDashboardActivityV2(): Promise<DashboardActivityV2> {
  const response = await apiClient.get<DashboardActivityV2>(`${API_BASE}/dashboard/v2/activity/`);
  if (!response.data) throw new Error("Failed to fetch recent activity");
  return response.data;
}

/**
 * Dashboard V2 - Get weekly progress
 */
export async function getDashboardWeeklyV2(): Promise<DashboardWeeklyV2> {
  const response = await apiClient.get<DashboardWeeklyV2>(`${API_BASE}/dashboard/v2/weekly/`);
  if (!response.data) throw new Error("Failed to fetch weekly progress");
  return response.data;
}

/**
 * Dashboard V2 - Get achievements
 */
export async function getDashboardAchievementsV2(): Promise<{ achievements: DashboardAchievementV2[] }> {
  const response = await apiClient.get<{ achievements: DashboardAchievementV2[] }>(`${API_BASE}/dashboard/v2/achievements/`);
  if (!response.data) throw new Error("Failed to fetch achievements");
  return response.data;
}

/**
 * Dashboard V2 - Clear all caches
 */
export async function clearDashboardCacheV2(): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>(`${API_BASE}/dashboard/v2/clear-cache/`);
  if (!response.data) throw new Error("Failed to clear cache");
  return response.data;
}

/**
 * Dashboard V2 - Load all data in parallel for faster initial load
 */
export async function loadDashboardDataV2() {
  const [overview, sections, books, activity, weekly, achievements] = await Promise.all([
    getDashboardOverviewV2(),
    getDashboardSectionsV2(),
    getDashboardBooksV2(),
    getDashboardActivityV2(),
    getDashboardWeeklyV2(),
    getDashboardAchievementsV2(),
  ]);

  return {
    overview,
    sections,
    books,
    activity,
    weekly,
    achievements,
  };
}

// ============================================================================
// ANALYTICS API (Subscription-based)
// ============================================================================

export interface AnalyticsOverview {
  total_attempts: number;
  total_practice_sessions: number;
  total_books_completed: number;
  overall_average: number | null;
  current_level: string;
  target_band: number;
  days_active: number;
  streak_days: number;
  section_averages: {
    reading: number | null;
    listening: number | null;
    writing: number | null;
    speaking: number | null;
  };
  subscription_tier: string | null;
  tier_limits: {
    has_weakness_analysis: boolean;
    has_band_prediction: boolean;
    has_ai_study_plan: boolean;
    history_days: number | string;
  };
}

export interface AnalyticsSkillBreakdown {
  subscription_tier: string | null;
  reading: {
    overall_accuracy: number;
    question_types: Record<string, { accuracy: number; attempts: number; trend: string }>;
    strengths: string[];
    weaknesses: string[];
  } | null;
  listening: {
    overall_accuracy: number;
    question_types: Record<string, { accuracy: number; attempts: number; trend: string }>;
    strengths: string[];
    weaknesses: string[];
  } | null;
  writing: {
    overall_score: number | null;
    task_scores: {
      task1: number | null;
      task2: number | null;
    };
    criteria_breakdown: Record<string, number>;
    improvement_areas: string[];
  } | null;
  speaking: {
    overall_score: number | null;
    part_scores: {
      part1: number | null;
      part2: number | null;
      part3: number | null;
    };
    criteria_breakdown: Record<string, number>;
    improvement_areas: string[];
  } | null;
}

export interface AnalyticsWeakness {
  section: string;
  weakness_type: string;
  current_score: number;
  target_score: number;
  priority: "high" | "medium" | "low";
  improvement_tips: string[];
}

export interface AnalyticsWeaknessAnalysis {
  subscription_tier: string | null;
  overall_weakest_section: string | null;
  weaknesses: AnalyticsWeakness[];
  priority_focus: string[];
  message?: string;
}

export interface AnalyticsProgressTrend {
  date: string;
  reading: number | null;
  listening: number | null;
  writing: number | null;
  speaking: number | null;
  overall: number | null;
}

export interface AnalyticsProgressTrends {
  subscription_tier: string | null;
  time_period: string;
  trends: AnalyticsProgressTrend[];
  improvement_rate: {
    reading: number;
    listening: number;
    writing: number;
    speaking: number;
    overall: number;
  };
}

export interface AnalyticsBandPrediction {
  subscription_tier: string | null;
  current_estimated_band: number | null;
  predicted_band: number | null;
  confidence_level: string;
  section_predictions: {
    reading: { current: number | null; predicted: number | null };
    listening: { current: number | null; predicted: number | null };
    writing: { current: number | null; predicted: number | null };
    speaking: { current: number | null; predicted: number | null };
  };
  time_to_goal: string;
  recommendation: string;
  message?: string;
}

export interface StudyPlanDay {
  day: string;
  focus_section: string;
  activities: string[];
  duration_minutes: number;
  goal: string;
}

export interface AnalyticsStudyPlan {
  subscription_tier: string | null;
  plan_type: string;
  weekly_plan: StudyPlanDay[];
  priority_sections: string[];
  total_weekly_hours: number;
  next_milestone: string;
  message?: string;
}

/**
 * Analytics - Get overview with subscription tier info
 */
export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const response = await apiClient.get<AnalyticsOverview>(`${API_BASE}/analytics/v2/overview/`);
  if (!response.data) throw new Error("Failed to fetch analytics overview");
  return response.data;
}

/**
 * Analytics - Get skill breakdown by section
 */
export async function getAnalyticsSkillBreakdown(): Promise<AnalyticsSkillBreakdown> {
  const response = await apiClient.get<AnalyticsSkillBreakdown>(`${API_BASE}/analytics/v2/skills/`);
  if (!response.data) throw new Error("Failed to fetch skill breakdown");
  return response.data;
}

/**
 * Analytics - Get weakness analysis (Pro+ only)
 */
export async function getAnalyticsWeaknesses(): Promise<AnalyticsWeaknessAnalysis> {
  const response = await apiClient.get<AnalyticsWeaknessAnalysis>(`${API_BASE}/analytics/v2/weaknesses/`);
  if (!response.data) throw new Error("Failed to fetch weakness analysis");
  return response.data;
}

/**
 * Analytics - Get progress trends over time
 */
export async function getAnalyticsProgressTrends(): Promise<AnalyticsProgressTrends> {
  const response = await apiClient.get<AnalyticsProgressTrends>(`${API_BASE}/analytics/v2/progress/`);
  if (!response.data) throw new Error("Failed to fetch progress trends");
  return response.data;
}

/**
 * Analytics - Get band prediction (Ultra only)
 */
export async function getAnalyticsBandPrediction(): Promise<AnalyticsBandPrediction> {
  const response = await apiClient.get<AnalyticsBandPrediction>(`${API_BASE}/analytics/v2/band-prediction/`);
  if (!response.data) throw new Error("Failed to fetch band prediction");
  return response.data;
}

/**
 * Analytics - Get AI study plan (Ultra only)
 */
export async function getAnalyticsStudyPlan(): Promise<AnalyticsStudyPlan> {
  const response = await apiClient.get<AnalyticsStudyPlan>(`${API_BASE}/analytics/v2/study-plan/`);
  if (!response.data) throw new Error("Failed to fetch study plan");
  return response.data;
}

/**
 * Analytics achievements response type
 */
export interface AnalyticsAchievements {
  subscription_tier: string | null;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    unlocked: boolean;
  }>;
  total_unlocked: number;
  next_achievements: Array<{
    id: string;
    name: string;
    progress: number;
    target: number;
  }>;
  stats: {
    total_exams: number;
    best_overall: number | null;
    practice_sessions: number;
    books_completed: number;
  };
  cached?: boolean;
}

/**
 * Analytics - Get user achievements (Available to ALL users)
 */
export async function getAnalyticsAchievements(): Promise<AnalyticsAchievements> {
  const response = await apiClient.get<AnalyticsAchievements>(`${API_BASE}/analytics/v2/achievements/`);
  if (!response.data) throw new Error("Failed to fetch achievements");
  return response.data;
}

/**
 * Helper to silently handle 403 subscription tier errors
 * Returns null for tier-restricted features instead of throwing
 */
function handleTierRestrictedError<T>(promise: Promise<T>): Promise<T | null> {
  return promise.catch((error) => {
    // Silently return null for 403 errors (subscription tier restrictions)
    // These are expected for users without the required subscription
    if (error?.status === 403) {
      return null;
    }
    // Log other errors for debugging
    console.error('Analytics API error:', error);
    return null;
  });
}

/**
 * Analytics - Load all analytics data in parallel using v2 endpoints
 * v2 endpoints are optimized with:
 * - Better caching (unified data fetch reduces DB queries)
 * - More features for free users (basic skills, achievements)
 * - Tier-restricted endpoints return null silently
 */
export async function loadAnalyticsData() {
  const [overview, skills, weaknesses, progress, bandPrediction, studyPlan, achievements] = await Promise.all([
    getAnalyticsOverview().catch(() => null),
    // Skills endpoint now available to ALL users (limited for free)
    getAnalyticsSkillBreakdown().catch(() => null),
    // Weaknesses still requires Pro+ tier
    handleTierRestrictedError(getAnalyticsWeaknesses()),
    getAnalyticsProgressTrends().catch(() => null),
    handleTierRestrictedError(getAnalyticsBandPrediction()),
    handleTierRestrictedError(getAnalyticsStudyPlan()),
    // Achievements available to ALL users
    getAnalyticsAchievements().catch(() => null),
  ]);

  return {
    overview,
    skills,
    weaknesses,
    progress,
    bandPrediction,
    studyPlan,
    achievements,
  };
}
