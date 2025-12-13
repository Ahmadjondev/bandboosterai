/**
 * Manager API Client
 * Port of Vue.js ManagerAPI service to React with TypeScript
 */

import type {
  DashboardStats,
  Student,
  StudentForm,
  BulkCreateResponse,
  ReadingPassage,
  ReadingPassageForm,
  ListeningPart,
  WritingTask,
  SpeakingTopic,
  TestHead,
  Question,
  QuestionForm,
  MockTest,
  MockTestFormLegacy as MockTestForm,
  Exam,
  ExamForm,
  StudentResult,
  StudentResultDetail,
  PaginatedResponse,
} from '@/types/manager';
import type {
  BookForm,
  SectionForm,
  BookWithStats,
  BookStats,
  PaginatedBooksResponse,
  PaginatedSectionsResponse,
  BooksFilters,
  SectionsFilters,
  AvailableContent,
  ReorderSectionsData,
} from '@/types/manager/books';
import type { Book, BookSection } from '@/types/books';
import { authClient } from './auth-client';

// Error types for better error handling
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

interface RequestConfig extends RequestInit {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

import { API_BASE_URL } from '@/config/api';

class ManagerAPIClient {
  private baseURL: string;
  private crossDomain: boolean;
  private redirecting: boolean;
  private isRefreshing: boolean;
  private refreshPromise: Promise<boolean> | null;
  private abortControllers: Map<string, AbortController>;

  constructor() {
    // Use direct Django URL instead of Next.js proxy
    this.baseURL = `${API_BASE_URL}/manager/api`;
    this.crossDomain = true; // Now making cross-origin requests
    this.redirecting = false;
    this.isRefreshing = false;
    this.refreshPromise = null;
    this.abortControllers = new Map();
  }

  /**
   * Get JWT access token from authClient
   */
  private getAccessToken(): string | null {
    return authClient.getAccessToken();
  }

  /**
   * Get JWT refresh token from authClient
   */
  private getRefreshToken(): string | null {
    return authClient.getRefreshToken();
  }

  /**
   * Set JWT tokens using authClient (not used anymore, auth-client handles this)
   */
  setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  /**
   * Clear JWT tokens using authClient
   */
  clearTokens(): void {
    authClient.logout();
  }

  /**
   * Refresh the access token using the refresh token
   * Uses singleton pattern to prevent multiple simultaneous refresh attempts
   */
  private async refreshAccessToken(): Promise<boolean> {
    // If already refreshing, wait for that to complete
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    // Start refresh process
    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const newAccessToken = await authClient.refreshToken();
        return !!newAccessToken;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Cancel an ongoing request by endpoint
   */
  cancelRequest(endpoint: string): void {
    const controller = this.abortControllers.get(endpoint);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(endpoint);
    }
  }

  /**
   * Cancel all ongoing requests
   */
  cancelAllRequests(): void {
    this.abortControllers.forEach((controller) => controller.abort());
    this.abortControllers.clear();
  }

  /**
   * Sleep utility for retry delays
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Make an authenticated API request with JWT, retry logic, and timeout
   */
  private async request<T>(
    endpoint: string,
    options: RequestConfig = {}
  ): Promise<T> {
    const {
      retries = 3,
      retryDelay = 1000,
      timeout = 30000,
      ...fetchOptions
    } = options;

    if (this.redirecting) {
      throw new AuthenticationError('Redirecting to login');
    }

    const url = `${this.baseURL}${endpoint}`;
    
    // Create abort controller for this request
    const abortController = new AbortController();
    this.abortControllers.set(endpoint, abortController);

    // Set up timeout
    const timeoutId = setTimeout(() => {
      abortController.abort();
      this.abortControllers.delete(endpoint);
    }, timeout);

    let lastError: Error | null = null;

    // Retry loop
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const accessToken = this.getAccessToken();
        
        // Check if we have an access token before making the request
        if (!accessToken) {
          clearTimeout(timeoutId);
          this.abortControllers.delete(endpoint);
          // eslint-disable-next-line no-console
          console.error('[ManagerAPI] No access token found — user must log in first. Endpoint:', endpoint);
          throw new AuthenticationError('No access token — please log in');
        }
        
        const defaultHeaders: HeadersInit = {
          'Content-Type': 'application/json',
        };

        // Add JWT Bearer token
        defaultHeaders['Authorization'] = `Bearer ${accessToken}`;

        const config: RequestInit = {
          ...fetchOptions,
          // credentials: this.crossDomain ? 'include' : 'same-origin',
          headers: {
            ...defaultHeaders,
            ...fetchOptions.headers,
          },
          signal: abortController.signal,
        };

        // Remove Content-Type for FormData (browser will set it with boundary)
        if (fetchOptions.body instanceof FormData) {
          const headers = config.headers as Record<string, string>;
          delete headers['Content-Type'];
        }

        const response = await fetch(url, config);

        // Detect redirects or HTML responses (login page)
        const contentType = response.headers.get('content-type') || '';
        if (response.redirected || response.status === 302 || contentType.includes('text/html')) {
          // Likely redirected to login page — treat as authentication error
          this.redirecting = true;
          clearTimeout(timeoutId);
          this.abortControllers.delete(endpoint);
          throw new AuthenticationError('Request redirected to login (possible missing/expired token)');
        }

        // Clear timeout and abort controller on success
        clearTimeout(timeoutId);
        this.abortControllers.delete(endpoint);

        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
          const refreshToken = this.getRefreshToken();

          // Try to refresh token if we have one and not already in auth endpoint
          if (
            refreshToken &&
            !endpoint.includes('/auth/') &&
            !this.isRefreshing
          ) {
            try {
              const refreshed = await this.refreshAccessToken();

              if (refreshed) {
                // Retry the original request with new token (don't count as retry)
                const newConfig = { ...config };
                const newToken = this.getAccessToken();
                if (newToken) {
                  (newConfig.headers as Record<string, string>)['Authorization'] =
                    `Bearer ${newToken}`;

                  const retryResponse = await fetch(url, newConfig);

                  if (retryResponse.ok) {
                    if (retryResponse.status === 204) {
                      return null as T;
                    }
                    return await retryResponse.json();
                  }
                }
              }
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
            }
          }

          // If refresh failed or no refresh token, clear tokens and throw error
          if (!this.redirecting) {
            this.redirecting = true;
            console.error('Authentication failed - tokens cleared');
            this.clearTokens();

            // Reset redirecting flag after a delay
            setTimeout(() => {
              this.redirecting = false;
            }, 1000);
          }
          throw new AuthenticationError('Authentication required');
        }

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: 'Request failed' }));

          // For bulk operations with partial success
          if (response.status === 400 && errorData.created !== undefined) {
            return errorData;
          }

          const errorMessage =
            errorData.error ||
            errorData.detail ||
            errorData.message ||
            `Request failed with status ${response.status}`;

          throw new APIError(errorMessage, response.status, errorData);
        }

        if (response.status === 204) {
          return null as T;
        }

        return await response.json();
      } catch (error: any) {
        lastError = error;

        // Don't retry on authentication errors or aborts
        if (
          error instanceof AuthenticationError ||
          error.name === 'AbortError'
        ) {
          clearTimeout(timeoutId);
          this.abortControllers.delete(endpoint);
          throw error;
        }

        // Don't retry on client errors (4xx except 429)
        if (error instanceof APIError) {
          if (
            error.statusCode &&
            error.statusCode >= 400 &&
            error.statusCode < 500 &&
            error.statusCode !== 429
          ) {
            clearTimeout(timeoutId);
            this.abortControllers.delete(endpoint);
            throw error;
          }
        }

        // If we have retries left, wait and try again
        if (attempt < retries) {
          const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
          console.log(
            `Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})...`
          );
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    clearTimeout(timeoutId);
    this.abortControllers.delete(endpoint);

    if (lastError) {
      if (lastError.name === 'AbortError') {
        throw new NetworkError('Request timeout');
      }
      throw lastError;
    }

    throw new NetworkError('Request failed after all retries');
  }

  // HTTP Methods
  async get<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.request<T>(url);
  }

  async post<T>(endpoint: string, data: any = {}): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any = {}): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data: any = {}): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async uploadFile<T>(endpoint: string, formData: FormData, timeout = 1200000): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      timeout: timeout,
    });
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    return this.get<DashboardStats>('/dashboard/stats/');
  }

  // Students
  async getStudents(params: Record<string, any> = {}): Promise<PaginatedResponse<Student>> {
    return this.get<PaginatedResponse<Student>>('/users/students/', params);
  }

  async getStudentDetail(userId: number): Promise<Student> {
    return this.get<Student>(`/users/students/${userId}/`);
  }

  async createStudent(data: StudentForm): Promise<Student> {
    return this.post<Student>('/users/students/create/', data);
  }

  async updateStudent(userId: number, data: Partial<StudentForm>): Promise<Student> {
    return this.put<Student>(`/users/students/${userId}/update/`, data);
  }

  async deleteStudent(userId: number): Promise<void> {
    return this.delete<void>(`/users/students/${userId}/delete/`);
  }

  async toggleStudentActive(userId: number): Promise<Student> {
    return this.post<Student>(`/users/students/${userId}/toggle-active/`);
  }

  // Reading Passages
  async getReadingPassages(params: Record<string, any> = {}): Promise<PaginatedResponse<ReadingPassage>> {
    return this.get<PaginatedResponse<ReadingPassage>>('/tests/reading/', params);
  }

  async getReadingPassage(passageId: number): Promise<ReadingPassage> {

    return this.get<ReadingPassage>(`/tests/reading/${passageId}/`);
  }

  async createReadingPassage(data: ReadingPassageForm): Promise<ReadingPassage> {
    return this.post<ReadingPassage>('/tests/reading/create/', data);
  }

  async updateReadingPassage(passageId: number, data: Partial<ReadingPassageForm>): Promise<ReadingPassage> {
    return this.put<ReadingPassage>(`/tests/reading/${passageId}/update/`, data);
  }

  async deleteReadingPassage(passageId: number): Promise<void> {
    return this.delete<void>(`/tests/reading/${passageId}/delete/`);
  }

  // Test Heads
  async getTestHeads(params: Record<string, any> = {}): Promise<TestHead[]> {
    return this.get<TestHead[]>('/tests/testheads/', params);
  }

  async getTestHead(testheadId: number): Promise<TestHead> {
    return this.get<TestHead>(`/tests/testhead/${testheadId}/`);
  }

  async createTestHead(data: any): Promise<TestHead> {
    return this.post<TestHead>('/tests/testhead/create/', data);
  }

  async updateTestHead(testheadId: number, data: any): Promise<TestHead> {
    return this.put<TestHead>(`/tests/testhead/${testheadId}/update/`, data);
  }

  async deleteTestHead(testheadId: number): Promise<void> {
    return this.delete<void>(`/tests/testhead/${testheadId}/delete/`);
  }

  // Questions
  async createQuestion(data: QuestionForm): Promise<Question> {
    return this.post<Question>('/tests/question/create/', data);
  }

  async createQuestionsBulk(data: any): Promise<any> {
    return this.post<any>('/tests/questions/bulk-create/', data);
  }

  async updateQuestion(questionId: number, data: Partial<QuestionForm>): Promise<Question> {
    return this.put<Question>(`/tests/question/${questionId}/update/`, data);
  }

  async deleteQuestion(questionId: number): Promise<void> {
    return this.delete<void>(`/tests/question/${questionId}/delete/`);
  }

  // Listening Parts
  async getListeningParts(params: Record<string, any> = {}): Promise<PaginatedResponse<ListeningPart>> {
    return this.get<PaginatedResponse<ListeningPart>>('/tests/listening/', params);
  }

  async getListeningPart(partId: number): Promise<ListeningPart> {
    return this.get<ListeningPart>(`/tests/listening/${partId}/`);
  }

  async createListeningPart(data: FormData | any): Promise<ListeningPart> {
    if (data instanceof FormData) {
      return this.uploadFile<ListeningPart>('/tests/listening/create/', data);
    }
    return this.post<ListeningPart>('/tests/listening/create/', data);
  }

  async updateListeningPart(partId: number, data: FormData | any): Promise<ListeningPart> {
    if (data instanceof FormData) {
      return this.request<ListeningPart>(`/tests/listening/${partId}/`, {
        method: 'PUT',
        body: data,
      });
    }
    return this.put<ListeningPart>(`/tests/listening/${partId}/`, data);
  }

  async deleteListeningPart(partId: number): Promise<void> {
    return this.delete<void>(`/tests/listening/${partId}/delete/`);
  }

  // Writing Tasks
  async getWritingTasks(params: Record<string, any> = {}): Promise<PaginatedResponse<WritingTask>> {
    return this.get<PaginatedResponse<WritingTask>>('/tests/writing/', params);
  }

  async createWritingTask(data: any): Promise<WritingTask> {
    // Support file uploads via FormData for writing tasks (picture field)
    if (data instanceof FormData) {
      return this.uploadFile<WritingTask>('/tests/writing/create/', data);
    }

    return this.post<WritingTask>('/tests/writing/create/', data);
  }

  async updateWritingTask(taskId: number, data: any): Promise<WritingTask> {
    // Support file upload/update via FormData
    if (data instanceof FormData) {
      return this.request<WritingTask>(`/tests/writing/${taskId}/update/`, {
        method: 'PUT',
        body: data,
      });
    }

    return this.put<WritingTask>(`/tests/writing/${taskId}/update/`, data);
  }

  async deleteWritingTask(taskId: number): Promise<void> {
    return this.delete<void>(`/tests/writing/${taskId}/delete/`);
  }

  // Speaking Topics
  async getSpeakingTopics(params: Record<string, any> = {}): Promise<PaginatedResponse<SpeakingTopic>> {
    return this.get<PaginatedResponse<SpeakingTopic>>('/tests/speaking/', params);
  }

  async getSpeakingTopicDetail(topicId: number): Promise<SpeakingTopic> {
    return this.get<SpeakingTopic>(`/tests/speaking/${topicId}/`);
  }

  async createSpeakingTopic(data: any): Promise<SpeakingTopic> {
    return this.post<SpeakingTopic>('/tests/speaking/create/', data);
  }

  async updateSpeakingTopic(topicId: number, data: any): Promise<SpeakingTopic> {
    return this.put<SpeakingTopic>(`/tests/speaking/${topicId}/update/`, data);
  }

  async deleteSpeakingTopic(topicId: number): Promise<void> {
    return this.delete<void>(`/tests/speaking/${topicId}/delete/`);
  }

  // Speaking Question APIs
  async addSpeakingQuestion(topicId: number, data: any): Promise<any> {
    return this.post(`/tests/speaking/${topicId}/questions/add/`, data);
  }

  async updateSpeakingQuestion(questionId: number, data: any): Promise<any> {
    return this.put(`/tests/speaking/questions/${questionId}/update/`, data);
  }

  async deleteSpeakingQuestion(questionId: number): Promise<void> {
    return this.delete<void>(`/tests/speaking/questions/${questionId}/delete/`);
  }

  // Speaking TTS (Text-to-Speech) APIs
  async generateTTSForTopic(topicId: number, voice: string = 'female_primary'): Promise<{
    success: boolean;
    topic_id: number;
    audio_url: string;
    audio_type: string;
    metadata: Record<string, any>;
  }> {
    return this.post(`/tests/speaking/${topicId}/generate-tts/`, { voice });
  }

  async generateTTSForQuestion(questionText: string, speakingPart: string = 'PART_1', voice: string = 'female_primary'): Promise<{
    success: boolean;
    audio_url: string;
    metadata: Record<string, any>;
  }> {
    return this.post('/tests/speaking/generate-tts/', {
      question_text: questionText,
      speaking_part: speakingPart,
      voice,
    });
  }

  async generateTTSBatch(topics: any[], voice: string = 'female_primary', generateAllQuestions: boolean = true): Promise<{
    success: boolean;
    generated: Array<{
      topic_index: number;
      part_number: number;
      question_audios?: Array<{
        question_index: number;
        question_text: string;
        audio_url: string;
      }>;
      cue_card_audio?: string;
    }>;
    errors: Array<{
      topic_index: number;
      question_index?: number;
      error: string;
    }>;
  }> {
    return this.post('/tests/speaking/generate-tts-batch/', {
      topics,
      voice,
      generate_all_questions: generateAllQuestions,
    });
  }

  async getTTSVoices(): Promise<{
    voices: Array<{
      id: string;
      name: string;
      voice_name: string;
      gender: string;
      description: string;
      recommended: boolean;
    }>;
    default: string;
  }> {
    return this.get('/tests/speaking/tts-voices/');
  }

  // Generate TTS for a saved SpeakingQuestion
  async generateTTSForSavedQuestion(questionId: number, voice: string = 'female_primary'): Promise<{
    success: boolean;
    question_id: number;
    audio_url: string;
    metadata: Record<string, any>;
  }> {
    return this.post(`/tests/speaking/question/${questionId}/generate-tts/`, { voice });
  }

  // Default Speaking Audio APIs
  async getDefaultSpeakingAudios(): Promise<{
    audios: Array<{
      audio_type: string;
      label: string;
      audio_url: string | null;
      default_script: string;
      script?: string;
      voice?: string;
      exists: boolean;
    }>;
    total: number;
    generated: number;
  }> {
    return this.get('/tests/speaking/default-audios/');
  }

  async generateDefaultSpeakingAudio(audioType: string, script?: string, voice: string = 'female_primary'): Promise<{
    success: boolean;
    audio_type: string;
    audio_url: string;
    script: string;
    voice: string;
    created: boolean;
  }> {
    return this.post('/tests/speaking/default-audios/generate/', {
      audio_type: audioType,
      script,
      voice,
    });
  }

  async generateAllDefaultSpeakingAudios(voice: string = 'female_primary'): Promise<{
    success: boolean;
    generated: Array<{
      audio_type: string;
      label: string;
      audio_url: string;
    }>;
    errors: Array<{
      audio_type: string;
      error: string;
    }>;
    total_generated: number;
    total_errors: number;
  }> {
    return this.post('/tests/speaking/default-audios/generate-all/', { voice });
  }

  async updateDefaultSpeakingAudio(audioType: string, script: string, voice?: string): Promise<{
    success: boolean;
    id: number;
    audio_type: string;
    script: string;
    audio_url: string;
    voice: string;
  }> {
    return this.put(`/tests/speaking/default-audios/${audioType}/update/`, { script, voice });
  }

  async deleteDefaultSpeakingAudio(audioType: string): Promise<{ success: boolean }> {
    return this.delete(`/tests/speaking/default-audios/${audioType}/delete/`);
  }

  // Mock Tests
  async getMockTests(params: Record<string, any> = {}): Promise<import('@/types/manager/mock-tests').MockTestsResponse> {
    return this.get('/mock-tests/', params);
  }

  async getMockTest(testId: number): Promise<import('@/types/manager/mock-tests').MockTestDetailResponse> {
    return this.get(`/mock-tests/${testId}/`);
  }

  async createMockTest(data: import('@/types/manager/mock-tests').MockTestForm): Promise<import('@/types/manager/mock-tests').MockTestCreateResponse> {
    return this.post('/mock-tests/create/', data);
  }

  async updateMockTest(testId: number, data: Partial<import('@/types/manager/mock-tests').MockTestForm>): Promise<import('@/types/manager/mock-tests').MockTestUpdateResponse> {
    return this.put(`/mock-tests/${testId}/update/`, data);
  }

  async toggleMockTestStatus(testId: number): Promise<import('@/types/manager/mock-tests').MockTestToggleResponse> {
    return this.post(`/mock-tests/${testId}/toggle/`);
  }

  async deleteMockTest(testId: number): Promise<import('@/types/manager/mock-tests').MockTestDeleteResponse> {
    return this.delete(`/mock-tests/${testId}/delete/`);
  }

  // Get available content for mock test selection
  async getReadingPassagesForMockTest(filters?: { passage_number?: number; search?: string }): Promise<import('@/types/manager/mock-tests').AvailableReadingPassages> {
    return this.get('/mock-tests/available/reading/', filters);
  }

  async getListeningPartsForMockTest(filters?: { part_number?: number; search?: string }): Promise<import('@/types/manager/mock-tests').AvailableListeningParts> {
    return this.get('/mock-tests/available/listening/', filters);
  }

  async getWritingTasksForMockTest(filters?: { task_type?: 'TASK_1' | 'TASK_2'; search?: string }): Promise<import('@/types/manager/mock-tests').AvailableWritingTasks> {
    return this.get('/mock-tests/available/writing/', filters);
  }

  async getSpeakingTopicsForMockTest(filters?: { speaking_type?: 'PART_1' | 'PART_2' | 'PART_3'; search?: string }): Promise<import('@/types/manager/mock-tests').AvailableSpeakingTopics> {
    return this.get('/mock-tests/available/speaking/', filters);
  }

  // Exams (Scheduled Exams)
  async getExams(params: Record<string, any> = {}): Promise<PaginatedResponse<Exam>> {
    return this.get<PaginatedResponse<Exam>>('/exams/', params);
  }

  async getExam(examId: number): Promise<Exam> {
    return this.get<Exam>(`/exams/${examId}/`);
  }

  async createExam(data: ExamForm): Promise<Exam> {
    return this.post<Exam>('/exams/create/', data);
  }

  async updateExam(examId: number, data: Partial<ExamForm>): Promise<Exam> {
    return this.put<Exam>(`/exams/${examId}/update/`, data);
  }

  async deleteExam(examId: number): Promise<void> {
    return this.delete<void>(`/exams/${examId}/delete/`);
  }

  async toggleExamStatus(examId: number, status: string): Promise<Exam> {
    return this.post<Exam>(`/exams/${examId}/toggle-status/`, { status });
  }

  async removeStudentFromExam(examId: number, studentId: number): Promise<void> {
    return this.post<void>(`/exams/${examId}/remove-student/${studentId}/`);
  }

  async getExamStatistics(): Promise<any> {
    return this.get<any>('/exams/statistics/');
  }

  async getExamResults(examId: number): Promise<StudentResult[]> {
    return this.get<StudentResult[]>(`/exams/${examId}/results/`);
  }

  // Results
  async getStudentResults(params: Record<string, any> = {}): Promise<PaginatedResponse<StudentResult>> {
    return this.get<PaginatedResponse<StudentResult>>('/results/students/', params);
  }

  async getStudentResultDetail(attemptId: number): Promise<StudentResultDetail> {
    return this.get<StudentResultDetail>(`/results/attempt/${attemptId}/`);
  }

  async evaluateWritingSubmission(attemptId: number, taskId: number, evaluationData: any): Promise<any> {
    return this.post<any>(`/results/attempt/${attemptId}/writing/${taskId}/evaluate/`, evaluationData);
  }

  getExamExportUrl(examId: number): string {
    return `/manager/api/exams/${examId}/export/`;
  }

  // Books Management
  async getBooks(params: BooksFilters = {}): Promise<PaginatedBooksResponse> {
    return this.get<PaginatedBooksResponse>('/books/', params);
  }

  async getBook(bookId: number): Promise<BookWithStats> {
    return this.get<BookWithStats>(`/books/${bookId}/`);
  }

  async getBookSections(bookId: number): Promise<BookSection[]> {
    return this.get<BookSection[]>(`/books/${bookId}/sections/`);
  }

  async createBook(data: BookForm): Promise<Book> {
    // Handle file upload if cover_image is a File
    if (data.cover_image instanceof File) {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('level', data.level);
      if (data.description) formData.append('description', data.description);
      if (data.author) formData.append('author', data.author);
      if (data.publisher) formData.append('publisher', data.publisher);
      if (data.publication_year) formData.append('publication_year', data.publication_year.toString());
      if (data.is_active !== undefined) formData.append('is_active', data.is_active.toString());
      if (data.is_premium !== undefined) formData.append('is_premium', data.is_premium.toString());
      formData.append('cover_image', data.cover_image);
      
      return this.uploadFile<Book>('/books/create/', formData);
    }
    
    return this.post<Book>('/books/create/', data);
  }

  async updateBook(bookId: number, data: Partial<BookForm>): Promise<Book> {
    // Handle file upload if cover_image is a File
    if (data.cover_image instanceof File) {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (value instanceof File) {
            formData.append(key, value);
          } else {
            formData.append(key, value.toString());
          }
        }
      });
      
      return this.request<Book>(`/books/${bookId}/update/`, {
        method: 'PUT',
        body: formData,
      });
    }
    
    return this.put<Book>(`/books/${bookId}/update/`, data);
  }

  async deleteBook(bookId: number): Promise<void> {
    return this.delete<void>(`/books/${bookId}/delete/`);
  }

  async toggleBookStatus(bookId: number): Promise<Book> {
    return this.post<Book>(`/books/${bookId}/toggle-status/`);
  }

  async getBookStats(bookId: number): Promise<BookStats> {
    return this.get<BookStats>(`/books/${bookId}/stats/`);
  }

  // Book Sections Management
  async getSections(params: SectionsFilters = {}): Promise<PaginatedSectionsResponse> {
    return this.get<PaginatedSectionsResponse>('/sections/', params);
  }

  async getSection(sectionId: number): Promise<BookSection> {
    return this.get<BookSection>(`/sections/${sectionId}/`);
  }

  async createSection(data: SectionForm): Promise<BookSection> {
    return this.post<BookSection>('/sections/create/', data);
  }

  async updateSection(sectionId: number, data: Partial<SectionForm>): Promise<BookSection> {
    return this.put<BookSection>(`/sections/${sectionId}/update/`, data);
  }

  async deleteSection(sectionId: number): Promise<void> {
    return this.delete<void>(`/sections/${sectionId}/delete/`);
  }

  async reorderSections(bookId: number, data: ReorderSectionsData): Promise<{ sections: BookSection[] }> {
    return this.post<{ sections: BookSection[] }>(`/books/${bookId}/reorder-sections/`, data);
  }

  async bulkSaveBookSections(bookId: number, formData: FormData): Promise<any> {
    return this.request<any>(`/books/${bookId}/sections/bulk-save/`, {
      method: 'POST',
      body: formData,
    });
  }

  async getAvailableContent(type: 'reading' | 'listening', search?: string): Promise<{ content: AvailableContent[] }> {
    const params: any = { type };
    if (search) params.search = search;
    return this.get<{ content: AvailableContent[] }>('/sections/available-content/', params);
  }

  // AI Content Generation
  /**
   * Generate IELTS content from PDF using AI
   * @param file PDF file to extract content from
   * @param contentType Type of content to extract (auto, reading, listening, writing, speaking)
   * @returns Extracted content data
   */
  async generateContentFromPdf(file: File, contentType: string = 'auto'): Promise<any> {
    const formData = new FormData();
    formData.append('pdf_file', file);
    formData.append('content_type', contentType);
    
    return this.uploadFile('/tests/ai-generate/', formData,);
  }

  /**
   * Upload and process JSON file with AI-generated content
   * This is client-side processing, returns the parsed JSON
   * @param file JSON file to process
   * @returns Parsed JSON content
   */
  async processJsonFile(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const jsonData = JSON.parse(content);
          
          // Validate JSON structure
          if (!jsonData.success || !jsonData.content_type) {
            reject(new Error('Invalid JSON format. Must have "success" and "content_type" fields.'));
            return;
          }
          
          resolve(jsonData);
        } catch (error) {
          if (error instanceof SyntaxError) {
            reject(new Error(`Invalid JSON format: ${error.message}`));
          } else {
            reject(error);
          }
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * Save AI-generated content to database
   * @param contentType Type of content (reading, listening, writing, speaking)
   * @param data Extracted data from AI generation
   * @returns Success response with created items
   */
  async saveGeneratedContent(contentType: string, data: any): Promise<any> {
    return this.post('/tests/ai-save/', {
      content_type: contentType,
      data: data
    });
  }

  /**
   * Save AI-generated content with images using FormData
   * @param formData FormData containing content_type, data, and images
   * @returns Success response with created items
   */
  async saveGeneratedContentWithImages(formData: FormData): Promise<any> {
    const accessToken = this.getAccessToken();
    const headers: Record<string, string> = {};
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    // Don't set Content-Type header for FormData, browser will set it with boundary
    const response = await this.request('/tests/ai-save/', {
      method: 'POST',
      body: formData,
      headers
    });
    return response;
  }

  // ============ Full Book / Cambridge IELTS Upload Methods ============

  /**
   * Generate COMPLETE IELTS test(s) from a Cambridge IELTS book PDF or similar
   * Extracts all sections: Listening, Reading, Writing, Speaking in one request
   * @param file PDF file (Cambridge IELTS book or similar)
   * @returns Complete test data with all sections for multiple tests
   */
  async generateFullTestFromPdf(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('pdf_file', file);
    
    // Use longer timeout for full book processing (20 minutes)
    return this.uploadFile('/tests/ai-generate-full/', formData, 1200000);
  }

  /**
   * Save a complete IELTS test (all sections) to database
   * @param testData Complete test data with listening, reading, writing, speaking
   * @param audios Optional audio files mapping for listening parts
   * @param images Optional image files for question groups
   * @returns Success message with created object IDs for all sections
   */
  async saveFullTestContent(
    testData: any,
    audios?: Record<string, File>,
    images?: Record<string, File>
  ): Promise<any> {
    const formData = new FormData();
    formData.append('test_data', JSON.stringify(testData));

    // Add audio files
    if (audios) {
      Object.entries(audios).forEach(([key, file]) => {
        formData.append(`audios[${key}]`, file);
      });
    }

    // Add image files
    if (images) {
      Object.entries(images).forEach(([key, file]) => {
        formData.append(`images[${key}]`, file);
      });
    }

    return this.uploadFile('/tests/ai-save-full/', formData);
  }

  /**
   * Upload multiple audio files at once for listening parts
   * @param files Array of audio files with their mappings
   * @returns List of uploaded audio URLs with their mappings
   */
  async uploadBatchAudio(files: Array<{ key: string; file: File }>): Promise<any> {
    const formData = new FormData();
    
    files.forEach(({ key, file }) => {
      formData.append(`audio_${key}`, file);
    });

    return this.uploadFile('/tests/upload-batch-audio/', formData);
  }

  /**
   * Upload a single audio file temporarily
   * @param file Audio file
   * @param partId Optional listening part ID
   * @returns Audio URL
   */
  async uploadAudioTemp(file: File, partId?: number): Promise<any> {
    const formData = new FormData();
    formData.append('audio_file', file);
    if (partId) {
      formData.append('part_id', partId.toString());
    }

    return this.uploadFile('/tests/upload-audio-temp/', formData);
  }

  // ============================================================================
  // Audio Splitting APIs (for cutting full listening audio into parts)
  // ============================================================================

  /**
   * Upload a full audio file temporarily and get analysis info
   * @param file Full audio file
   * @returns Audio info with suggested split points
   */
  async uploadFullAudioForSplitting(file: File): Promise<{
    success: boolean;
    temp_id: string;
    audio_url: string;
    filename: string;
    file_size: number;
    duration: {
      duration_seconds: number;
      duration_ms: number;
      duration_formatted: string;
    };
    suggested_splits: Array<{
      part_number: number;
      start_ms: number;
      end_ms: number;
      start_formatted: string;
      end_formatted: string;
      duration_seconds: number;
    }>;
  }> {
    const formData = new FormData();
    formData.append('audio_file', file);
    return this.uploadFile('/tests/audio/upload-temp/', formData, 300000); // 5 min timeout
  }

  /**
   * Analyze an audio file and return duration and suggested split points
   * @param file Audio file to analyze
   * @returns Audio analysis with suggested splits
   */
  async analyzeAudioFile(file: File): Promise<{
    success: boolean;
    duration: {
      duration_seconds: number;
      duration_ms: number;
      duration_formatted: string;
    };
    suggested_splits: Array<{
      part_number: number;
      start_ms: number;
      end_ms: number;
      start_formatted: string;
      end_formatted: string;
      duration_seconds: number;
    }>;
    error?: string;
  }> {
    const formData = new FormData();
    formData.append('audio_file', file);
    return this.uploadFile('/tests/audio/analyze/', formData, 120000); // 2 min timeout
  }

  /**
   * Split a previously uploaded audio file by timestamps
   * @param tempId Temporary ID from uploadFullAudioForSplitting
   * @param audioUrl Temporary audio URL
   * @param timestamps Array of split points with start/end in milliseconds
   * @param outputFormat Output format (mp3 or wav)
   * @returns Split audio parts with URLs
   */
  async splitUploadedAudio(
    tempId: string,
    audioUrl: string,
    timestamps: Array<{ start: number; end: number }>,
    outputFormat: string = 'mp3'
  ): Promise<{
    success: boolean;
    batch_id: string;
    parts: Array<{
      part_number: number;
      start_ms: number;
      end_ms: number;
      start_formatted: string;
      end_formatted: string;
      duration_seconds: number;
      audio_url: string;
      filename: string;
    }>;
    error?: string;
  }> {
    return this.post('/tests/audio/split-uploaded/', {
      temp_id: tempId,
      audio_url: audioUrl,
      timestamps,
      output_format: outputFormat,
    });
  }

  /**
   * Split an audio file directly (upload + split in one request)
   * @param file Audio file to split
   * @param timestamps Optional timestamps for split points
   * @param autoSplit If true and no timestamps, split equally into 4 parts
   * @returns Split audio parts with URLs
   */
  async splitAudioFile(
    file: File,
    timestamps?: Array<{ start: string | number; end: string | number }>,
    autoSplit: boolean = false,
    outputFormat: string = 'mp3'
  ): Promise<{
    success: boolean;
    original_duration: {
      duration_seconds: number;
      duration_ms: number;
      duration_formatted: string;
    };
    batch_id: string;
    parts: Array<{
      part_number: number;
      start_ms: number;
      end_ms: number;
      start_formatted: string;
      end_formatted: string;
      duration_seconds: number;
      audio_url: string;
      filename: string;
    }>;
    error?: string;
  }> {
    const formData = new FormData();
    formData.append('audio_file', file);
    if (timestamps) {
      formData.append('timestamps', JSON.stringify(timestamps));
    }
    formData.append('auto_split', autoSplit.toString());
    formData.append('output_format', outputFormat);
    
    return this.uploadFile('/tests/audio/split/', formData, 300000); // 5 min timeout
  }

  // ============================================================================
  // Practice Creation APIs (from tests endpoint)
  // ============================================================================

  /**
   * Create a single section practice from saved content via tests endpoint
   * @param data Practice creation data
   * @returns Created practice details
   */
  async createPracticeFromTest(data: {
    section_type: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';
    content_id: number;
    name?: string;
    description?: string;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
    time_limit?: number;
    is_free?: boolean;
    is_active?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    practice: {
      id: number;
      uuid: string;
      name: string;
      section_type: string;
      difficulty: string;
      content_id: number;
    };
  }> {
    return this.post('/tests/create-practice/', data);
  }

  /**
   * Create multiple section practices in batch
   * @param practices Array of practice data
   * @param defaultDifficulty Default difficulty for all practices
   * @returns Created practices with their IDs
   */
  async createPracticesBatch(
    practices: Array<{
      section_type: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';
      content_id: number;
      name?: string;
      description?: string;
      difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
      time_limit?: number;
      is_free?: boolean;
    }>,
    defaultDifficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT' = 'MEDIUM'
  ): Promise<{
    success: boolean;
    created_count: number;
    error_count: number;
    created_practices: Array<{
      id: number;
      uuid: string;
      name: string;
      section_type: string;
      difficulty: string;
      content_id: number;
    }>;
    errors: Array<{
      index: number;
      error: string;
    }>;
    message: string;
  }> {
    return this.post('/tests/create-practices-batch/', {
      practices,
      default_difficulty: defaultDifficulty,
    });
  }

  // ============================================================================
  // Promo Code Management APIs
  // ============================================================================

  /**
   * Get all promo codes with optional filtering
   * @param status Filter by status: all, active, inactive, expired
   * @param search Search by code or description
   */
  async getPromoCodes(
    status: 'all' | 'active' | 'inactive' | 'expired' = 'all',
    search?: string
  ): Promise<{
    promo_codes: any[];
    stats: {
      total_codes: number;
      active_codes: number;
      total_usages: number;
      total_discount_given: number;
    };
  }> {
    const params = new URLSearchParams();
    params.append('status', status);
    if (search) params.append('search', search);
    return this.get(`/promo-codes/?${params.toString()}`);
  }

  /**
   * Get a single promo code with usage details
   * @param promoId Promo code ID
   */
  async getPromoCode(promoId: number): Promise<any> {
    return this.get(`/promo-codes/${promoId}/`);
  }

  /**
   * Create a new promo code
   * @param data Promo code form data
   */
  async createPromoCode(data: {
    code: string;
    description?: string;
    discount_type: 'PERCENTAGE' | 'FIXED';
    discount_value: number;
    applicable_plans?: number[];
    min_purchase_amount?: number;
    max_discount_amount?: number | null;
    usage_limit?: number | null;
    usage_limit_per_user?: number;
    valid_from?: string | null;
    valid_until?: string | null;
    is_active?: boolean;
  }): Promise<any> {
    return this.post('/promo-codes/create/', data);
  }

  /**
   * Update an existing promo code
   * @param promoId Promo code ID
   * @param data Updated promo code data
   */
  async updatePromoCode(promoId: number, data: any): Promise<any> {
    return this.put(`/promo-codes/${promoId}/update/`, data);
  }

  /**
   * Delete a promo code
   * @param promoId Promo code ID
   */
  async deletePromoCode(promoId: number): Promise<void> {
    return this.delete(`/promo-codes/${promoId}/delete/`);
  }

  /**
   * Toggle promo code active status
   * @param promoId Promo code ID
   */
  async togglePromoCodeStatus(promoId: number): Promise<{
    id: number;
    code: string;
    is_active: boolean;
    message: string;
  }> {
    return this.post(`/promo-codes/${promoId}/toggle-status/`, {});
  }

  /**
   * Get usage history for a promo code
   * @param promoId Promo code ID
   */
  async getPromoCodeUsages(promoId: number): Promise<{
    code: string;
    total_usages: number;
    usages: any[];
  }> {
    return this.get(`/promo-codes/${promoId}/usages/`);
  }

  /**
   * Get promo code analytics
   */
  async getPromoAnalytics(): Promise<{
    overview: {
      total_codes: number;
      active_codes: number;
      inactive_codes: number;
    };
    usage_stats: {
      total_usages: number;
      usages_last_7_days: number;
      usages_last_30_days: number;
    };
    revenue_stats: {
      total_discount_given: number;
      total_revenue_from_promos: number;
      original_value: number;
    };
    top_performing_codes: any[];
    recent_usages: any[];
  }> {
    return this.get('/promo-codes/analytics/');
  }

  /**
   * Get available subscription plans for promo code restriction
   */
  async getAvailablePlans(): Promise<Array<{
    id: number;
    name: string;
    plan_type: string;
    price: number;
    billing_period: string;
  }>> {
    return this.get('/promo-codes/plans/');
  }

  // ==========================================
  // Section Practices Management
  // ==========================================

  /**
   * Get all section practices with filters
   */
  async getSectionPractices(filters: {
    section_type?: 'reading' | 'listening' | 'writing' | 'speaking';
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
    is_free?: boolean;
    is_active?: boolean;
    task_type?: 'TASK_1' | 'TASK_2';
    chart_type?: string;
    search?: string;
    page?: number;
    page_size?: number;
  } = {}): Promise<{
    practices: any[];
    pagination: {
      total: number;
      page: number;
      page_size: number;
      total_pages: number;
      has_next: boolean;
      has_previous: boolean;
    };
    available_filters?: any;
  }> {
    const params = new URLSearchParams();
    if (filters.section_type) params.append('section_type', filters.section_type);
    if (filters.difficulty) params.append('difficulty', filters.difficulty);
    if (filters.is_free !== undefined) params.append('is_free', String(filters.is_free));
    if (filters.is_active !== undefined) params.append('is_active', String(filters.is_active));
    if (filters.task_type) params.append('task_type', filters.task_type);
    if (filters.chart_type) params.append('chart_type', filters.chart_type);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.page_size) params.append('page_size', String(filters.page_size));
    
    const queryString = params.toString();
    return this.get(`/section-practices/${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get a single section practice detail
   * @param practiceId Section practice ID
   */
  async getSectionPractice(practiceId: number): Promise<any> {
    return this.get(`/section-practices/${practiceId}/`);
  }

  /**
   * Create a new section practice
   * @param data Section practice form data
   */
  async createSectionPractice(data: {
    section_type: 'reading' | 'listening' | 'writing' | 'speaking';
    title: string;
    description?: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
    duration_minutes?: number;
    is_free?: boolean;
    is_active?: boolean;
    reading_passage_id?: number;
    listening_part_id?: number;
    writing_task_id?: number;
    speaking_topic_id?: number;
  }): Promise<any> {
    return this.post('/section-practices/create/', data);
  }

  /**
   * Update an existing section practice
   * @param practiceId Section practice ID
   * @param data Updated section practice data
   */
  async updateSectionPractice(practiceId: number, data: {
    title?: string;
    description?: string;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
    duration_minutes?: number;
    is_free?: boolean;
    is_active?: boolean;
    order?: number;
  }): Promise<any> {
    return this.put(`/section-practices/${practiceId}/update/`, data);
  }

  /**
   * Delete a section practice
   * @param practiceId Section practice ID
   */
  async deleteSectionPractice(practiceId: number): Promise<void> {
    return this.delete(`/section-practices/${practiceId}/delete/`);
  }

  /**
   * Toggle section practice active status
   * @param practiceId Section practice ID
   */
  async toggleSectionPracticeStatus(practiceId: number): Promise<{
    id: number;
    title: string;
    is_active: boolean;
    message: string;
  }> {
    return this.post(`/section-practices/${practiceId}/toggle-status/`, {});
  }

  /**
   * Get available content for creating section practices
   * @param sectionType Optional section type filter
   */
  async getPracticeAvailableContent(sectionType?: 'reading' | 'listening' | 'writing' | 'speaking'): Promise<{
    reading?: any[];
    listening?: any[];
    writing?: any[];
    speaking?: any[];
  }> {
    const params = sectionType ? `?section_type=${sectionType}` : '';
    return this.get(`/section-practices/available-content/${params}`);
  }

  /**
   * Get section practice statistics
   */
  async getSectionPracticeStats(): Promise<{
    total_practices: number;
    active_practices: number;
    free_practices: number;
    by_section: {
      reading: number;
      listening: number;
      writing: number;
      speaking: number;
    };
    by_difficulty: {
      EASY: number;
      MEDIUM: number;
      HARD: number;
      EXPERT: number;
    };
    total_attempts: number;
    recent_practices: any[];
  }> {
    return this.get('/section-practices/stats/');
  }

  // ============================================================================
  // Listening Practices API
  // ============================================================================

  /**
   * Get list of listening practices
   */
  async getListeningPractices(filters: {
    difficulty?: string;
    is_active?: boolean;
    is_free?: boolean;
    search?: string;
    page?: number;
    page_size?: number;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    if (filters.difficulty) params.append('difficulty', filters.difficulty);
    if (filters.is_active !== undefined) params.append('is_active', String(filters.is_active));
    if (filters.is_free !== undefined) params.append('is_free', String(filters.is_free));
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.page_size) params.append('page_size', String(filters.page_size));
    const queryString = params.toString();
    return this.get(`/practices/listening/${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get a single listening practice
   */
  async getListeningPractice(practiceId: number): Promise<any> {
    return this.get(`/practices/listening/${practiceId}/`);
  }

  /**
   * Get available listening content for creating practices
   */
  async getAvailableListeningContent(): Promise<any> {
    return this.get('/practices/listening/available/');
  }

  /**
   * Create a listening practice
   */
  async createListeningPractice(data: {
    content_id: number;
    title?: string;
    description?: string;
    difficulty?: string;
    duration_minutes?: number;
    is_free?: boolean;
    is_active?: boolean;
  }): Promise<any> {
    return this.post('/practices/listening/create/', data);
  }

  /**
   * Update a listening practice
   */
  async updateListeningPractice(practiceId: number, data: {
    title?: string;
    description?: string;
    difficulty?: string;
    duration_minutes?: number;
    is_free?: boolean;
    is_active?: boolean;
    order?: number;
  }): Promise<any> {
    return this.put(`/practices/listening/${practiceId}/update/`, data);
  }

  /**
   * Delete a listening practice
   */
  async deleteListeningPractice(practiceId: number, force: boolean = false): Promise<any> {
    return this.delete(`/practices/listening/${practiceId}/delete/${force ? '?force=true' : ''}`);
  }

  /**
   * Toggle listening practice status
   */
  async toggleListeningPracticeStatus(practiceId: number): Promise<any> {
    return this.post(`/practices/listening/${practiceId}/toggle-status/`, {});
  }

  /**
   * Bulk create listening practices
   */
  async bulkCreateListeningPractices(data: {
    content_ids: number[];
    default_difficulty?: string;
    default_is_free?: boolean;
    default_is_active?: boolean;
  }): Promise<any> {
    return this.post('/practices/listening/bulk-create/', data);
  }

  // ============================================================================
  // Reading Practices API
  // ============================================================================

  /**
   * Get list of reading practices
   */
  async getReadingPractices(filters: {
    difficulty?: string;
    is_active?: boolean;
    is_free?: boolean;
    search?: string;
    page?: number;
    page_size?: number;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    if (filters.difficulty) params.append('difficulty', filters.difficulty);
    if (filters.is_active !== undefined) params.append('is_active', String(filters.is_active));
    if (filters.is_free !== undefined) params.append('is_free', String(filters.is_free));
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.page_size) params.append('page_size', String(filters.page_size));
    const queryString = params.toString();
    return this.get(`/practices/reading/${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get a single reading practice
   */
  async getReadingPractice(practiceId: number): Promise<any> {
    return this.get(`/practices/reading/${practiceId}/`);
  }

  /**
   * Get available reading content for creating practices
   */
  async getAvailableReadingContent(): Promise<any> {
    return this.get('/practices/reading/available/');
  }

  /**
   * Create a reading practice
   */
  async createReadingPractice(data: {
    content_id: number;
    title?: string;
    description?: string;
    difficulty?: string;
    duration_minutes?: number;
    is_free?: boolean;
    is_active?: boolean;
  }): Promise<any> {
    return this.post('/practices/reading/create/', data);
  }

  /**
   * Update a reading practice
   */
  async updateReadingPractice(practiceId: number, data: {
    title?: string;
    description?: string;
    difficulty?: string;
    duration_minutes?: number;
    is_free?: boolean;
    is_active?: boolean;
    order?: number;
  }): Promise<any> {
    return this.put(`/practices/reading/${practiceId}/update/`, data);
  }

  /**
   * Delete a reading practice
   */
  async deleteReadingPractice(practiceId: number, force: boolean = false): Promise<any> {
    return this.delete(`/practices/reading/${practiceId}/delete/${force ? '?force=true' : ''}`);
  }

  /**
   * Toggle reading practice status
   */
  async toggleReadingPracticeStatus(practiceId: number): Promise<any> {
    return this.post(`/practices/reading/${practiceId}/toggle-status/`, {});
  }

  /**
   * Bulk create reading practices
   */
  async bulkCreateReadingPractices(data: {
    content_ids: number[];
    default_difficulty?: string;
    default_is_free?: boolean;
    default_is_active?: boolean;
  }): Promise<any> {
    return this.post('/practices/reading/bulk-create/', data);
  }

  // ============================================================================
  // Writing Practices API
  // ============================================================================

  /**
   * Get list of writing practices
   */
  async getWritingPractices(filters: {
    difficulty?: string;
    is_active?: boolean;
    is_free?: boolean;
    task_type?: string;
    chart_type?: string;
    search?: string;
    page?: number;
    page_size?: number;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    if (filters.difficulty) params.append('difficulty', filters.difficulty);
    if (filters.is_active !== undefined) params.append('is_active', String(filters.is_active));
    if (filters.is_free !== undefined) params.append('is_free', String(filters.is_free));
    if (filters.task_type) params.append('task_type', filters.task_type);
    if (filters.chart_type) params.append('chart_type', filters.chart_type);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.page_size) params.append('page_size', String(filters.page_size));
    const queryString = params.toString();
    return this.get(`/practices/writing/${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get a single writing practice
   */
  async getWritingPractice(practiceId: number): Promise<any> {
    return this.get(`/practices/writing/${practiceId}/`);
  }

  /**
   * Get available writing content for creating practices
   */
  async getAvailableWritingContent(filters: {
    task_type?: string;
    chart_type?: string;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    if (filters.task_type) params.append('task_type', filters.task_type);
    if (filters.chart_type) params.append('chart_type', filters.chart_type);
    const queryString = params.toString();
    return this.get(`/practices/writing/available/${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Create a writing practice
   */
  async createWritingPractice(data: {
    content_id: number;
    title?: string;
    description?: string;
    difficulty?: string;
    duration_minutes?: number;
    is_free?: boolean;
    is_active?: boolean;
  }): Promise<any> {
    return this.post('/practices/writing/create/', data);
  }

  /**
   * Update a writing practice
   */
  async updateWritingPractice(practiceId: number, data: {
    title?: string;
    description?: string;
    difficulty?: string;
    duration_minutes?: number;
    is_free?: boolean;
    is_active?: boolean;
    order?: number;
  }): Promise<any> {
    return this.put(`/practices/writing/${practiceId}/update/`, data);
  }

  /**
   * Delete a writing practice
   */
  async deleteWritingPractice(practiceId: number, force: boolean = false): Promise<any> {
    return this.delete(`/practices/writing/${practiceId}/delete/${force ? '?force=true' : ''}`);
  }

  /**
   * Toggle writing practice status
   */
  async toggleWritingPracticeStatus(practiceId: number): Promise<any> {
    return this.post(`/practices/writing/${practiceId}/toggle-status/`, {});
  }

  /**
   * Bulk create writing practices
   */
  async bulkCreateWritingPractices(data: {
    content_ids: number[];
    default_difficulty?: string;
    default_is_free?: boolean;
    default_is_active?: boolean;
  }): Promise<any> {
    return this.post('/practices/writing/bulk-create/', data);
  }

  // ============================================================================
  // Speaking Practices API
  // ============================================================================

  /**
   * Get list of speaking practices
   */
  async getSpeakingPractices(filters: {
    difficulty?: string;
    is_active?: boolean;
    is_free?: boolean;
    speaking_type?: string;
    search?: string;
    page?: number;
    page_size?: number;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    if (filters.difficulty) params.append('difficulty', filters.difficulty);
    if (filters.is_active !== undefined) params.append('is_active', String(filters.is_active));
    if (filters.is_free !== undefined) params.append('is_free', String(filters.is_free));
    if (filters.speaking_type) params.append('speaking_type', filters.speaking_type);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.page_size) params.append('page_size', String(filters.page_size));
    const queryString = params.toString();
    return this.get(`/practices/speaking/${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get a single speaking practice
   */
  async getSpeakingPractice(practiceId: number): Promise<any> {
    return this.get(`/practices/speaking/${practiceId}/`);
  }

  /**
   * Get available speaking content for creating practices
   */
  async getAvailableSpeakingContent(filters: {
    speaking_type?: string;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    if (filters.speaking_type) params.append('speaking_type', filters.speaking_type);
    const queryString = params.toString();
    return this.get(`/practices/speaking/available/${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Create a speaking practice
   */
  async createSpeakingPractice(data: {
    content_id: number;
    title?: string;
    description?: string;
    difficulty?: string;
    duration_minutes?: number;
    is_free?: boolean;
    is_active?: boolean;
  }): Promise<any> {
    return this.post('/practices/speaking/create/', data);
  }

  /**
   * Update a speaking practice
   */
  async updateSpeakingPractice(practiceId: number, data: {
    title?: string;
    description?: string;
    difficulty?: string;
    duration_minutes?: number;
    is_free?: boolean;
    is_active?: boolean;
    order?: number;
  }): Promise<any> {
    return this.put(`/practices/speaking/${practiceId}/update/`, data);
  }

  /**
   * Delete a speaking practice
   */
  async deleteSpeakingPractice(practiceId: number, force: boolean = false): Promise<any> {
    return this.delete(`/practices/speaking/${practiceId}/delete/${force ? '?force=true' : ''}`);
  }

  /**
   * Toggle speaking practice status
   */
  async toggleSpeakingPracticeStatus(practiceId: number): Promise<any> {
    return this.post(`/practices/speaking/${practiceId}/toggle-status/`, {});
  }

  /**
   * Bulk create speaking practices
   */
  async bulkCreateSpeakingPractices(data: {
    content_ids: number[];
    default_difficulty?: string;
    default_is_free?: boolean;
    default_is_active?: boolean;
  }): Promise<any> {
    return this.post('/practices/speaking/bulk-create/', data);
  }

  // ============================================================================
  // Practices Stats API
  // ============================================================================

  /**
   * Get aggregate practices statistics
   */
  async getPracticesStats(sectionType?: string): Promise<any> {
    const params = sectionType ? `?section_type=${sectionType}` : '';
    return this.get(`/practices/stats/${params}`);
  }
}

// Create singleton instance
export const managerAPI = new ManagerAPIClient();

// Export for default import
export default managerAPI;
