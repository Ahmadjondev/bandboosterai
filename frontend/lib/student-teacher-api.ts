import { apiClient } from './api-client';
import type {
  TeacherExam,
  TeacherExamAttempt,
  TeacherExamAttemptDetail,
} from '@/types/teacher';

/**
 * Student API for accessing Teacher Exams
 */
export const studentTeacherExamApi = {
  /**
   * Get all available public teacher exams
   */
  async getPublicExams(): Promise<TeacherExam[]> {
    const response = await apiClient.get<TeacherExam[]>('/teacher/api/exams/?is_public=true');
    if (!response.data) throw new Error('Failed to fetch public exams');
    return response.data;
  },

  /**
   * Get student's enrolled teacher exams
   */
  async getMyExams(): Promise<TeacherExam[]> {
    try {
      const response = await apiClient.get<TeacherExam[]>('/teacher/api/exams/my_exams/');
      // Return empty array if no data
      return response.data || [];
    } catch (error: any) {
      // If 403 error (not a student), return empty array instead of throwing
      if (error?.status === 403) {
        console.warn('User is not a student, cannot access teacher exams');
        return [];
      }
      // For other errors, still throw them
      throw error;
    }
  },

  /**
   * Join exam with access code
   */
  async joinExam(accessCode: string): Promise<{ message: string; exam: TeacherExam }> {
    const response = await apiClient.post<{ message: string; exam: TeacherExam }>(
      '/teacher/api/exams/join/',
      { access_code: accessCode }
    );
    if (!response.data) throw new Error('Failed to join exam');
    return response.data;
  },

  /**
   * Get exam detail
   */
  async getExamDetail(examId: number): Promise<TeacherExam> {
    const response = await apiClient.get<TeacherExam>(`/teacher/api/exams/${examId}/`);
    if (!response.data) throw new Error('Failed to fetch exam detail');
    return response.data;
  },

  /**
   * Start exam attempt
   */
  async startExam(examId: number): Promise<TeacherExamAttempt> {
    const response = await apiClient.post<TeacherExamAttempt>(
      `/teacher/api/exams/${examId}/start/`
    );
    if (!response.data) throw new Error('Failed to start exam');
    return response.data;
  },

  /**
   * Get student's attempt for an exam
   */
  async getMyAttempt(examId: number): Promise<TeacherExamAttempt | null> {
    try {
      const response = await apiClient.get<TeacherExamAttempt>(
        `/teacher/api/exams/${examId}/my_attempt/`
      );
      return response.data || null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get detailed attempt result
   */
  async getAttemptResult(attemptId: number): Promise<TeacherExamAttemptDetail> {
    const response = await apiClient.get<TeacherExamAttemptDetail>(
      `/teacher/api/attempts/${attemptId}/`
    );
    if (!response.data) throw new Error('Failed to fetch attempt result');
    return response.data;
  },

  /**
   * Submit exam attempt
   */
  async submitExam(attemptId: number): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      `/teacher/api/attempts/${attemptId}/submit/`
    );
    if (!response.data) throw new Error('Failed to submit exam');
    return response.data;
  },
};
