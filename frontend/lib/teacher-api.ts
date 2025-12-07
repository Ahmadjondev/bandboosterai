import { apiClient } from './api-client';
import type {
  TeacherExam,
  TeacherExamDetail,
  TeacherExamAttempt,
  TeacherExamAttemptDetail,
  TeacherFeedback,
  DashboardStats,
  ExamPerformanceSummary,
  StudentResult,
  CreateExamData,
  UpdateExamData,
  GradeAttemptData,
  CreateFeedbackData,
  MockExamBasic,
  StudentAnalytics,
  PerformanceOverview,
  ExamAnalytics,
} from '@/types/teacher';

/**
 * Teacher Dashboard API
 */
export const teacherDashboardApi = {
  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>('/teacher/api/dashboard/stats/');
    if (!response.data) throw new Error('Failed to fetch dashboard stats');
    return response.data;
  },

  /**
   * Get recent exams
   */
  async getRecentExams(): Promise<TeacherExam[]> {
    const response = await apiClient.get<TeacherExam[]>('/teacher/api/dashboard/recent_exams/');
    if (!response.data) throw new Error('Failed to fetch recent exams');
    return response.data;
  },

  /**
   * Get attempts pending grading
   */
  async getPendingGrades(): Promise<TeacherExamAttempt[]> {
    const response = await apiClient.get<TeacherExamAttempt[]>('/teacher/api/dashboard/pending_grades/');
    if (!response.data) throw new Error('Failed to fetch pending grades');
    return response.data;
  },

  /**
   * Get detailed student analytics
   */
  async getStudentsAnalytics(): Promise<StudentAnalytics[]> {
    const response = await apiClient.get<StudentAnalytics[]>('/teacher/api/dashboard/students-analytics/');
    if (!response.data) throw new Error('Failed to fetch student analytics');
    return response.data;
  },

  /**
   * Get performance overview with trends and distributions
   */
  async getPerformanceOverview(): Promise<PerformanceOverview> {
    const response = await apiClient.get<PerformanceOverview>('/teacher/api/dashboard/performance-overview/');
    if (!response.data) throw new Error('Failed to fetch performance overview');
    return response.data;
  },

  /**
   * Get exam analytics
   */
  async getExamAnalytics(): Promise<ExamAnalytics[]> {
    const response = await apiClient.get<ExamAnalytics[]>('/teacher/api/dashboard/exam-analytics/');
    if (!response.data) throw new Error('Failed to fetch exam analytics');
    return response.data;
  },
};

/**
 * Teacher Exam API
 */
export const teacherExamApi = {
  /**
   * Get all exams
   */
  async getExams(): Promise<TeacherExam[]> {
    const response = await apiClient.get<TeacherExam[]>('/teacher/api/exams/');
    if (!response.data) throw new Error('Failed to fetch exams');
    return response.data;
  },

  /**
   * Get exam by ID
   */
  async getExam(id: number): Promise<TeacherExamDetail> {
    const response = await apiClient.get<TeacherExamDetail>(`/teacher/api/exams/${id}/`);
    if (!response.data) throw new Error('Failed to fetch exam');
    return response.data;
  },

  /**
   * Create new exam
   */
  async createExam(data: CreateExamData): Promise<TeacherExam> {
    const response = await apiClient.post<TeacherExam>('/teacher/api/exams/', data);
    if (!response.data) throw new Error('Failed to create exam');
    return response.data;
  },

  /**
   * Update exam
   */
  async updateExam(id: number, data: UpdateExamData): Promise<TeacherExam> {
    const response = await apiClient.patch<TeacherExam>(`/teacher/api/exams/${id}/`, data);
    if (!response.data) throw new Error('Failed to update exam');
    return response.data;
  },

  /**
   * Delete exam
   */
  async deleteExam(id: number): Promise<void> {
    await apiClient.delete(`/teacher/api/exams/${id}/`);
  },

  /**
   * Publish exam
   */
  async publishExam(id: number): Promise<{ message: string; status: string }> {
    const response = await apiClient.post<{ message: string; status: string }>(`/teacher/api/exams/${id}/publish/`);
    if (!response.data) throw new Error('Failed to publish exam');
    return response.data;
  },

  /**
   * Unpublish exam (set back to draft)
   */
  async unpublishExam(id: number): Promise<{ message: string; status: string }> {
    const response = await apiClient.post<{ message: string; status: string }>(`/teacher/api/exams/${id}/unpublish/`);
    if (!response.data) throw new Error('Failed to unpublish exam');
    return response.data;
  },

  /**
   * Toggle exam status between DRAFT and PUBLISHED
   */
  async toggleExamStatus(id: number): Promise<{ message: string; status: string }> {
    const response = await apiClient.post<{ message: string; status: string }>(`/teacher/api/exams/${id}/toggle-status/`);
    if (!response.data) throw new Error('Failed to toggle exam status');
    return response.data;
  },

  /**
   * Archive exam
   */
  async archiveExam(id: number): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/teacher/api/exams/${id}/archive/`);
    if (!response.data) throw new Error('Failed to archive exam');
    return response.data;
  },

  /**
   * Toggle results visibility for students
   */
  async toggleResultsVisible(id: number): Promise<{ message: string; results_visible: boolean }> {
    const response = await apiClient.post<{ message: string; results_visible: boolean }>(`/teacher/api/exams/${id}/toggle-results-visible/`);
    if (!response.data) throw new Error('Failed to toggle results visibility');
    return response.data;
  },

  /**
   * Get exam performance summary
   */
  async getExamPerformance(id: number): Promise<ExamPerformanceSummary> {
    const response = await apiClient.get<ExamPerformanceSummary>(`/teacher/api/exams/${id}/performance/`);
    if (!response.data) throw new Error('Failed to fetch exam performance');
    return response.data;
  },

  /**
   * Get student attempts for exam
   */
  async getExamStudents(id: number): Promise<TeacherExamAttempt[]> {
    const response = await apiClient.get<TeacherExamAttempt[]>(`/teacher/api/exams/${id}/students/`);
    if (!response.data) throw new Error('Failed to fetch exam students');
    return response.data;
  },

  /**
   * Assign students to exam
   */
  async assignStudents(id: number, studentIds: number[]): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      `/teacher/api/exams/${id}/assign_students/`,
      { student_ids: studentIds }
    );
    if (!response.data) throw new Error('Failed to assign students');
    return response.data;
  },

  /**
   * Get available mock exams
   */
  async getAvailableMockExams(): Promise<MockExamBasic[]> {
    const response = await apiClient.get<MockExamBasic[]>('/teacher/api/exams/available-mock-exams/');
    if (!response.data) throw new Error('Failed to fetch available mock exams');
    return response.data;
  },
};

/**
 * Teacher Mock Exam API
 */
export const teacherMockExamApi = {
  /**
   * Get all mock exams with filters
   */
  async getMockExams(params?: {
    status?: string;
    exam_type?: string;
    search?: string;
  }): Promise<MockExamBasic[]> {
    let url = '/teacher/api/mock-exams/';
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.append('status', params.status);
      if (params.exam_type) queryParams.append('exam_type', params.exam_type);
      if (params.search) queryParams.append('search', params.search);
      const queryString = queryParams.toString();
      if (queryString) url += `?${queryString}`;
    }
    const response = await apiClient.get<MockExamBasic[]>(url);
    if (!response.data) throw new Error('Failed to fetch mock exams');
    return response.data;
  },

  /**
   * Get mock exam statistics
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    by_type: Array<{ exam_type: string; count: number }>;
  }> {
    const response = await apiClient.get<any>('/teacher/api/mock-exams/stats/');
    if (!response.data) throw new Error('Failed to fetch stats');
    return response.data;
  },

  /**
   * Get single mock exam
   */
  async getMockExam(id: number): Promise<MockExamBasic> {
    const response = await apiClient.get<MockExamBasic>(`/teacher/api/mock-exams/${id}/`);
    if (!response.data) throw new Error('Failed to fetch mock exam');
    return response.data;
  },

  /**
   * Create mock exam
   */
  async createMockExam(data: any): Promise<{ success: boolean; message: string; data: MockExamBasic }> {
    const response = await apiClient.post<any>('/teacher/api/mock-exams/', data);
    if (!response.data) throw new Error('Failed to create mock exam');
    return response.data;
  },

  /**
   * Update mock exam
   */
  async updateMockExam(id: number, data: any): Promise<MockExamBasic> {
    const response = await apiClient.put<MockExamBasic>(`/teacher/api/mock-exams/${id}/`, data);
    if (!response.data) throw new Error('Failed to update mock exam');
    return response.data;
  },

  /**
   * Delete mock exam
   */
  async deleteMockExam(id: number): Promise<void> {
    await apiClient.delete(`/teacher/api/mock-exams/${id}/`);
  },

  /**
   * Get available reading passages for mock test selection
   */
  async getAvailableReadingPassages(filters?: { passage_number?: number; search?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.passage_number) params.append('passage_number', filters.passage_number.toString());
    if (filters?.search) params.append('search', filters.search);
    
    const queryString = params.toString();
    const url = `/teacher/api/mock-exams/available/reading/${queryString ? '?' + queryString : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  /**
   * Get available listening parts for mock test selection
   */
  async getAvailableListeningParts(filters?: { part_number?: number; search?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.part_number) params.append('part_number', filters.part_number.toString());
    if (filters?.search) params.append('search', filters.search);
    
    const queryString = params.toString();
    const url = `/teacher/api/mock-exams/available/listening/${queryString ? '?' + queryString : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  /**
   * Get available writing tasks for mock test selection
   */
  async getAvailableWritingTasks(filters?: { task_type?: string; search?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.task_type) params.append('task_type', filters.task_type);
    if (filters?.search) params.append('search', filters.search);
    
    const queryString = params.toString();
    const url = `/teacher/api/mock-exams/available/writing/${queryString ? '?' + queryString : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  /**
   * Get available speaking topics for mock test selection
   */
  async getAvailableSpeakingTopics(filters?: { speaking_type?: string; search?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.speaking_type) params.append('speaking_type', filters.speaking_type);
    if (filters?.search) params.append('search', filters.search);
    
    const queryString = params.toString();
    const url = `/teacher/api/mock-exams/available/speaking/${queryString ? '?' + queryString : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  },
};

/**
 * Teacher Exam Attempt API
 */
export const teacherAttemptApi = {
  /**
   * Get all attempts
   */
  async getAttempts(): Promise<TeacherExamAttempt[]> {
    const response = await apiClient.get<TeacherExamAttempt[]>('/teacher/api/attempts/');
    if (!response.data) throw new Error('Failed to fetch attempts');
    return response.data;
  },

  /**
   * Get attempt by ID
   */
  async getAttempt(id: number): Promise<TeacherExamAttemptDetail> {
    const response = await apiClient.get<TeacherExamAttemptDetail>(`/teacher/api/attempts/${id}/`);
    if (!response.data) throw new Error('Failed to fetch attempt');
    return response.data;
  },

  /**
   * Get attempt analysis
   */
  async getAttemptAnalysis(id: number): Promise<StudentResult> {
    const response = await apiClient.get<StudentResult>(`/teacher/api/attempts/${id}/analysis/`);
    if (!response.data) throw new Error('Failed to fetch attempt analysis');
    return response.data;
  },

  /**
   * Grade attempt
   */
  async gradeAttempt(id: number, data: GradeAttemptData): Promise<TeacherExamAttemptDetail> {
    const response = await apiClient.post<TeacherExamAttemptDetail>(
      `/teacher/api/attempts/${id}/grade/`,
      data
    );
    if (!response.data) throw new Error('Failed to grade attempt');
    return response.data;
  },
};

/**
 * Teacher Feedback API
 */
export const teacherFeedbackApi = {
  /**
   * Get all feedback
   */
  async getFeedbacks(): Promise<TeacherFeedback[]> {
    const response = await apiClient.get<TeacherFeedback[]>('/teacher/api/feedback/');
    if (!response.data) throw new Error('Failed to fetch feedbacks');
    return response.data;
  },

  /**
   * Get feedback by ID
   */
  async getFeedback(id: number): Promise<TeacherFeedback> {
    const response = await apiClient.get<TeacherFeedback>(`/teacher/api/feedback/${id}/`);
    if (!response.data) throw new Error('Failed to fetch feedback');
    return response.data;
  },

  /**
   * Create feedback
   */
  async createFeedback(data: CreateFeedbackData): Promise<TeacherFeedback> {
    const response = await apiClient.post<TeacherFeedback>('/teacher/api/feedback/', data);
    if (!response.data) throw new Error('Failed to create feedback');
    return response.data;
  },

  /**
   * Update feedback
   */
  async updateFeedback(id: number, data: Partial<CreateFeedbackData>): Promise<TeacherFeedback> {
    const response = await apiClient.patch<TeacherFeedback>(`/teacher/api/feedback/${id}/`, data);
    if (!response.data) throw new Error('Failed to update feedback');
    return response.data;
  },

  /**
   * Delete feedback
   */
  async deleteFeedback(id: number): Promise<void> {
    await apiClient.delete(`/teacher/api/feedback/${id}/`);
  },
};
