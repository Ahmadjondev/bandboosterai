import type { ApiResponse, ApiError } from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.bandbooster.uz';

interface FetchOptions extends RequestInit {
  token?: string;
}

/**
 * Get access token from localStorage
 */
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

/**
 * Get refresh token from localStorage
 */
function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token');
}

/**
 * Set tokens in localStorage
 */
function setTokens(access: string, refresh: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
}

/**
 * Clear tokens from localStorage
 */
function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/accounts/api/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      return null;
    }

    const data = await response.json();
    if (data.access) {
      localStorage.setItem('access_token', data.access);
      return data.access;
    }

    return null;
  } catch (error) {
    clearTokens();
    return null;
  }
}

/**
 * Base API client for making HTTP requests to Django backend with JWT authentication
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a request to the API with automatic token refresh
   */
  private async request<T>(
    endpoint: string,
    options: FetchOptions = {},
    retryWithRefresh: boolean = true
  ): Promise<ApiResponse<T>> {
    const { token, headers: customHeaders, ...restOptions } = options;

    // Get access token
    let accessToken = token || getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(customHeaders as Record<string, string>),
    };

    // Add JWT authorization header if token exists
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...restOptions,
        headers,
      });

      // If 401 and we haven't retried yet, try to refresh token
      if (response.status === 401 && retryWithRefresh) {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          // Retry request with new token
          return this.request<T>(endpoint, { ...options, token: newAccessToken }, false);
        }
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const error: ApiError = {
          message: data?.message || data?.error || data?.detail || 'An error occurred',
          status: response.status,
          details: data?.details,
        };
        // Include the full response data for field-specific errors
        (error as any).response = { data };
        throw error;
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      if (error instanceof Error && 'status' in error) {
        throw error;
      }
      throw {
        message: error instanceof Error ? error.message : 'Network error',
        status: 0,
      } as ApiError;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: FetchOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: FetchOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: unknown,
    options?: FetchOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    data?: unknown,
    options?: FetchOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: FetchOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();

// Export token management functions for use in auth.ts
export { getAccessToken, getRefreshToken, setTokens, clearTokens };

// ============================================================================
// WRITING CHECKER API
// ============================================================================

export interface WritingCheckRequest {
  essay: string;
  task_type?: 'Task 1' | 'Task 2';
}

export interface SentenceCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

export interface WritingCheckResponse {
  status: 'processing' | 'completed' | 'failed';
  writing_attempt_id?: number;
  inline?: string;
  sentences?: SentenceCorrection[];
  summary?: string;
  band_score?: string;
  corrected_essay?: string;
  message?: string;
}

export const writingCheckerApi = {
  /**
   * Submit essay for AI checking
   */
  async checkWriting(data: WritingCheckRequest): Promise<ApiResponse<WritingCheckResponse>> {
    return apiClient.post<WritingCheckResponse>('/exams/api/writing/check/', data);
  },

  /**
   * Get writing check result by ID (for polling)
   */
  async getWritingCheckResult(writingAttemptId: number): Promise<ApiResponse<WritingCheckResponse>> {
    return apiClient.get<WritingCheckResponse>(
      `/exams/api/writing/check/${writingAttemptId}/`
    );
  },

  /**
   * Poll for writing check result until completed or failed
   * @param writingAttemptId - The writing attempt ID to poll
   * @param onProgress - Callback for progress updates
   * @param maxAttempts - Maximum polling attempts (default: 60 = 5 minutes with 5s interval)
   * @param interval - Polling interval in ms (default: 5000 = 5 seconds)
   */
  async pollWritingCheckResult(
    writingAttemptId: number,
    onProgress?: (status: string) => void,
    maxAttempts: number = 60,
    interval: number = 5000
  ): Promise<WritingCheckResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await this.getWritingCheckResult(writingAttemptId);

      if (!response.data) {
        throw new Error(response.error || 'Failed to fetch result');
      }

      const { status } = response.data;

      if (onProgress) {
        onProgress(status);
      }

      if (status === 'completed') {
        return response.data;
      }

      if (status === 'failed') {
        throw new Error(response.data.message || 'AI check failed');
      }

      // Wait before next poll
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    }

    throw new Error('Polling timeout: Result not ready after maximum attempts');
  },
};



