/**
 * BandBooster Classroom Command: API Client
 * 
 * API client for the Classroom module - managing classrooms, enrollments,
 * assignment bundles, and grading operations.
 */

import { apiClient } from './api-client';
import type {
  Classroom,
  ClassroomDetail,
  ClassroomList,
  ClassroomFormData,
  Enrollment,
  StudentRoster,
  JoinClassroomResponse,
  AssignmentBundle,
  AssignmentBundleList,
  AssignmentBundleFormData,
  BundleItem,
  BundleItemFormData,
  StudentAssignment,
  StudentAssignmentList,
  GradingQueueResponse,
  GradingSubmission,
  GradingStats,
  ClassroomAnalytics,
  MockExamBasic,
  TeacherExamBasic,
  WritingTaskBasic,
  SpeakingTopicBasic,
  ReadingPassageBasic,
  ListeningPartBasic,
  ContentSearchFilters,
} from '@/types/classroom';

const BASE_URL = '/classroom/api';

// ============================================
// Classroom API
// ============================================

export const classroomApi = {
  // List teacher's classrooms
  list: async (): Promise<ClassroomList[]> => {
    const response = await apiClient.get<ClassroomList[]>(`${BASE_URL}/classrooms/`);
    return response.data;
  },

  // Get classroom details
  get: async (id: number): Promise<ClassroomDetail> => {
    const response = await apiClient.get<ClassroomDetail>(`${BASE_URL}/classrooms/${id}/`);
    return response.data;
  },

  // Create classroom
  create: async (data: ClassroomFormData): Promise<Classroom> => {
    const response = await apiClient.post<Classroom>(`${BASE_URL}/classrooms/`, data);
    return response.data;
  },

  // Update classroom
  update: async (id: number, data: Partial<ClassroomFormData>): Promise<Classroom> => {
    const response = await apiClient.patch<Classroom>(`${BASE_URL}/classrooms/${id}/`, data);
    return response.data;
  },

  // Delete classroom
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/classrooms/${id}/`);
  },

  // Regenerate invite code
  regenerateInvite: async (id: number): Promise<{ invite_code: string; magic_link: string }> => {
    const response = await apiClient.post<{ invite_code: string; magic_link: string }>(
      `${BASE_URL}/classrooms/${id}/regenerate_invite/`
    );
    return response.data;
  },

  // Toggle invite enabled
  toggleInvites: async (id: number): Promise<{ invite_enabled: boolean }> => {
    const response = await apiClient.post<{ invite_enabled: boolean }>(
      `${BASE_URL}/classrooms/${id}/toggle_invites/`
    );
    return response.data;
  },

  // Get classroom roster
  roster: async (id: number): Promise<StudentRoster[]> => {
    const response = await apiClient.get<StudentRoster[]>(`${BASE_URL}/classrooms/${id}/roster/`);
    return response.data;
  },

  // Get classroom analytics
  analytics: async (id: number): Promise<ClassroomAnalytics> => {
    const response = await apiClient.get<ClassroomAnalytics>(`${BASE_URL}/classrooms/${id}/analytics/`);
    return response.data;
  },

  // Remove student from classroom
  removeStudent: async (classroomId: number, studentId: number): Promise<void> => {
    await apiClient.post(`${BASE_URL}/classrooms/${classroomId}/remove_student/`, {
      student_id: studentId,
    });
  },
};

// ============================================
// Enrollment API
// ============================================

export const enrollmentApi = {
  // List enrollments (context-dependent: teacher sees their classroom enrollments, students see their own)
  list: async (): Promise<Enrollment[]> => {
    const response = await apiClient.get<Enrollment[]>(`${BASE_URL}/enrollments/`);
    return response.data;
  },

  // Join classroom via invite code (students)
  join: async (inviteCode: string): Promise<Enrollment> => {
    const response = await apiClient.post<Enrollment>(`${BASE_URL}/enrollments/join/`, {
      invite_code: inviteCode,
    });
    return response.data;
  },

  // Get student's classrooms
  myClassrooms: async (): Promise<Enrollment[]> => {
    const response = await apiClient.get<Enrollment[]>(`${BASE_URL}/enrollments/my_classrooms/`);
    return response.data;
  },

  // Leave classroom
  leave: async (enrollmentId: number): Promise<void> => {
    await apiClient.post(`${BASE_URL}/enrollments/${enrollmentId}/leave/`);
  },

  // Update teacher notes
  updateNotes: async (enrollmentId: number, notes: string): Promise<Enrollment> => {
    const response = await apiClient.post<Enrollment>(
      `${BASE_URL}/enrollments/${enrollmentId}/update_notes/`,
      { notes }
    );
    return response.data;
  },
};

// ============================================
// Public Join API (for magic links)
// ============================================

export const joinApi = {
  // Check invite code validity
  check: async (inviteCode: string): Promise<JoinClassroomResponse> => {
    const response = await apiClient.get<JoinClassroomResponse>(
      `${BASE_URL}/join/${inviteCode}/`
    );
    return response.data;
  },
};

// ============================================
// Assignment Bundle API
// ============================================

export const bundleApi = {
  // List bundles (optionally filtered by classroom)
  list: async (filters?: { classroom?: number; status?: string }): Promise<AssignmentBundleList[]> => {
    const params = new URLSearchParams();
    if (filters?.classroom) params.append('classroom', String(filters.classroom));
    if (filters?.status) params.append('status', filters.status);
    
    const response = await apiClient.get<AssignmentBundleList[]>(
      `${BASE_URL}/bundles/?${params.toString()}`
    );
    return response.data;
  },

  // Get bundle details
  get: async (id: number): Promise<AssignmentBundle> => {
    const response = await apiClient.get<AssignmentBundle>(`${BASE_URL}/bundles/${id}/`);
    return response.data;
  },

  // Create bundle
  create: async (data: AssignmentBundleFormData): Promise<AssignmentBundle> => {
    const response = await apiClient.post<AssignmentBundle>(`${BASE_URL}/bundles/`, data);
    return response.data;
  },

  // Update bundle
  update: async (id: number, data: Partial<AssignmentBundleFormData>): Promise<AssignmentBundle> => {
    const response = await apiClient.patch<AssignmentBundle>(`${BASE_URL}/bundles/${id}/`, data);
    return response.data;
  },

  // Delete bundle
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/bundles/${id}/`);
  },

  // Publish bundle
  publish: async (id: number): Promise<AssignmentBundle> => {
    const response = await apiClient.post<AssignmentBundle>(`${BASE_URL}/bundles/${id}/publish/`);
    return response.data;
  },

  // Close bundle
  close: async (id: number): Promise<AssignmentBundle> => {
    const response = await apiClient.post<AssignmentBundle>(`${BASE_URL}/bundles/${id}/close/`);
    return response.data;
  },

  // Add item to bundle
  addItem: async (bundleId: number, item: BundleItemFormData): Promise<BundleItem> => {
    const response = await apiClient.post<BundleItem>(
      `${BASE_URL}/bundles/${bundleId}/add_item/`,
      item
    );
    return response.data;
  },

  // Remove item from bundle
  removeItem: async (bundleId: number, itemId: number): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/bundles/${bundleId}/remove_item/${itemId}/`);
  },

  // Get submissions for bundle
  submissions: async (bundleId: number): Promise<StudentAssignmentList[]> => {
    const response = await apiClient.get<StudentAssignmentList[]>(
      `${BASE_URL}/bundles/${bundleId}/submissions/`
    );
    return response.data;
  },
};

// ============================================
// Grading API
// ============================================

export const gradingApi = {
  // Get grading queue
  queue: async (classroomId?: number): Promise<GradingQueueResponse> => {
    const params = classroomId ? `?classroom=${classroomId}` : '';
    const response = await apiClient.get<GradingQueueResponse>(
      `${BASE_URL}/grading/queue/${params}`
    );
    return response.data;
  },

  // Get grading detail
  detail: async (assignmentId: number): Promise<StudentAssignment> => {
    const response = await apiClient.get<StudentAssignment>(
      `${BASE_URL}/grading/${assignmentId}/detail/`
    );
    return response.data;
  },

  // Submit grade
  grade: async (assignmentId: number, data: GradingSubmission): Promise<StudentAssignment> => {
    const response = await apiClient.post<StudentAssignment>(
      `${BASE_URL}/grading/${assignmentId}/grade/`,
      data
    );
    return response.data;
  },

  // Get grading stats
  stats: async (): Promise<GradingStats> => {
    const response = await apiClient.get<GradingStats>(`${BASE_URL}/grading/stats/`);
    return response.data;
  },
};

// ============================================
// Student Assignment API
// ============================================

export const studentAssignmentApi = {
  // List student's assignments
  list: async (): Promise<StudentAssignmentList[]> => {
    const response = await apiClient.get<StudentAssignmentList[]>(`${BASE_URL}/assignments/`);
    return response.data;
  },

  // Get assignment details
  get: async (id: number): Promise<StudentAssignment> => {
    const response = await apiClient.get<StudentAssignment>(`${BASE_URL}/assignments/${id}/`);
    return response.data;
  },

  // Start assignment
  start: async (id: number): Promise<StudentAssignment> => {
    const response = await apiClient.post<StudentAssignment>(
      `${BASE_URL}/assignments/${id}/start/`
    );
    return response.data;
  },

  // Submit assignment
  submit: async (id: number): Promise<StudentAssignment> => {
    const response = await apiClient.post<StudentAssignment>(
      `${BASE_URL}/assignments/${id}/submit/`
    );
    return response.data;
  },

  // Save item progress
  saveItem: async (
    assignmentId: number,
    itemId: number,
    data: {
      writing_answer?: string;
      speaking_audio?: File;
      answers_json?: Record<string, string>;
      time_spent_seconds?: number;
    }
  ): Promise<any> => {
    const payload: Record<string, any> = { item_id: itemId };
    
    if (data.writing_answer) payload.writing_answer = data.writing_answer;
    if (data.answers_json) payload.answers_json = data.answers_json;
    if (data.time_spent_seconds) payload.time_spent_seconds = data.time_spent_seconds;
    
    // For audio files, use FormData
    if (data.speaking_audio) {
      const formData = new FormData();
      formData.append('item_id', String(itemId));
      formData.append('speaking_audio', data.speaking_audio);
      if (data.time_spent_seconds) formData.append('time_spent_seconds', String(data.time_spent_seconds));
      
      return apiClient.post(
        `${BASE_URL}/assignments/${assignmentId}/save_item/`,
        formData
      );
    }

    return apiClient.post(
      `${BASE_URL}/assignments/${assignmentId}/save_item/`,
      payload
    );
  },
};

// ============================================
// Content Search API
// ============================================

export const contentSearchApi = {
  // Search mock exams
  mockExams: async (filters?: ContentSearchFilters): Promise<MockExamBasic[]> => {
    const params = new URLSearchParams();
    if (filters?.q) params.append('q', filters.q);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    
    const response = await apiClient.get<MockExamBasic[]>(
      `${BASE_URL}/content/mock_exams/?${params.toString()}`
    );
    return response.data;
  },

  // Search writing tasks
  writingTasks: async (filters?: ContentSearchFilters): Promise<WritingTaskBasic[]> => {
    const params = new URLSearchParams();
    if (filters?.q) params.append('q', filters.q);
    if (filters?.type) params.append('type', filters.type);
    
    const response = await apiClient.get<WritingTaskBasic[]>(
      `${BASE_URL}/content/writing_tasks/?${params.toString()}`
    );
    return response.data;
  },

  // Search speaking topics
  speakingTopics: async (filters?: ContentSearchFilters): Promise<SpeakingTopicBasic[]> => {
    const params = new URLSearchParams();
    if (filters?.q) params.append('q', filters.q);
    if (filters?.part) params.append('part', String(filters.part));
    
    const response = await apiClient.get<SpeakingTopicBasic[]>(
      `${BASE_URL}/content/speaking_topics/?${params.toString()}`
    );
    return response.data;
  },

  // Search reading passages
  readingPassages: async (filters?: ContentSearchFilters): Promise<ReadingPassageBasic[]> => {
    const params = new URLSearchParams();
    if (filters?.q) params.append('q', filters.q);
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    
    const response = await apiClient.get<ReadingPassageBasic[]>(
      `${BASE_URL}/content/reading_passages/?${params.toString()}`
    );
    return response.data;
  },

  // Search listening parts
  listeningParts: async (filters?: ContentSearchFilters): Promise<ListeningPartBasic[]> => {
    const params = new URLSearchParams();
    if (filters?.q) params.append('q', filters.q);
    if (filters?.part) params.append('part', String(filters.part));
    
    const response = await apiClient.get<ListeningPartBasic[]>(
      `${BASE_URL}/content/listening_parts/?${params.toString()}`
    );
    return response.data;
  },

  // Search teacher's own exams
  teacherExams: async (filters?: ContentSearchFilters): Promise<TeacherExamBasic[]> => {
    const params = new URLSearchParams();
    if (filters?.q) params.append('q', filters.q);
    
    const response = await apiClient.get<TeacherExamBasic[]>(
      `${BASE_URL}/content/teacher_exams/?${params.toString()}`
    );
    return response.data;
  },
};

// Export all APIs
export const classroomModule = {
  classroom: classroomApi,
  enrollment: enrollmentApi,
  join: joinApi,
  bundle: bundleApi,
  grading: gradingApi,
  studentAssignment: studentAssignmentApi,
  contentSearch: contentSearchApi,
};

export default classroomModule;
