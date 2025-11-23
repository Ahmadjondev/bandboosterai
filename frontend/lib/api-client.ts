import type { ApiResponse, ApiError } from '@/types/api';
import { API_BASE_URL } from '@/config/api';

// Global notification handler - set by NotificationProvider
let globalNotificationHandler: ((statusCode?: number) => void) | null = null;

export function setGlobalNotificationHandler(handler: ((statusCode?: number) => void) | null) {
  globalNotificationHandler = handler;
}

// Global logout handler - set by auth context/provider
let globalLogoutHandler: (() => void) | null = null;

export function setGlobalLogoutHandler(handler: (() => void) | null) {
  globalLogoutHandler = handler;
}

// Specialized error thrown when API requires email verification
// EmailNotVerifiedError defined at top of file

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
 * Logout user - clear tokens and redirect to login
 */
function logoutUser(): void {
  clearTokens();
  
  // Call global logout handler if available
  if (globalLogoutHandler) {
    globalLogoutHandler();
  } else {
    // Fallback: redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
  }
}

/**
 * Refresh access token using refresh token
 * CRITICAL: Only clear tokens on 401 (expired refresh token)
 * DO NOT clear tokens on network errors or server errors (500, 503)
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

    // ✅ 401 = Refresh token is invalid/expired → Clear tokens and logout
    if (response.status === 401) {
      clearTokens();
      return null;
    }

    // ⚠️ 500/503 = Server error → Keep tokens, return null to NOT retry
    // This will cause the original request to fail but user stays logged in
    if (response.status === 500 || response.status === 503) {
      console.warn('[Token Refresh] Server error during token refresh, keeping user logged in');
      return null;
    }

    // ❌ Other errors (400, 404, etc.) → Also invalid, clear tokens
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
    // 🌐 Network error → Keep tokens, don't logout
    console.warn('[Token Refresh] Network error during token refresh, keeping user logged in');
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

  let accessToken = token || getAccessToken();

  // Check if body is FormData - if so, don't set Content-Type
  const isFormData = restOptions.body instanceof FormData;

const headers: Record<string, string> = {
  // Only set Content-Type for non-FormData requests
  ...(!isFormData && { "Content-Type": "application/json" }),
  ...(typeof customHeaders === "object" &&
  customHeaders !== null &&
  !Array.isArray(customHeaders)
    ? (customHeaders as Record<string, string>)
    : {}),
};

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...restOptions,
      headers,
    });
     // ⚠️ 500/503 Server Errors → Show banner, don't logout
    if (response.status === 500 || response.status === 503) {
      // Show server error banner
      if (globalNotificationHandler) {
        globalNotificationHandler(response.status);
      }
      
      // Still throw the error so components can handle it
      const data = await response.json().catch(() => null);
      throw <ApiError>{
        message: "The server is temporarily unavailable.",
        status: response.status,
        details: data?.details,
        code: "server_error",
      };
    }
    // ⛔ 401 Unauthorized → Try to refresh token
    if (response.status === 401 && retryWithRefresh) {
      const newAccessToken = await refreshAccessToken();
      if (newAccessToken) {
        // Token refreshed successfully - retry the original request
        return this.request<T>(
          endpoint,
          { ...options, token: newAccessToken },
          false
        );
      } else {
        // Refresh failed - check if tokens were cleared (means 401 on refresh)
        // If tokens still exist, refresh failed due to network/server error → don't logout
        const stillHasToken = getRefreshToken() !== null;
        
        if (stillHasToken) {
          // Refresh failed due to network/server error, not expired token
          // Show error but keep user logged in
          if (globalNotificationHandler) {
            globalNotificationHandler();
          }
          throw <ApiError>{
            message: "Unable to verify your session. Please try again.",
            status: 401,
            code: "refresh_failed",
          };
        } else {
          // Tokens were cleared = refresh token expired (401 on refresh)
          // → Log the user out
          logoutUser();
          throw <ApiError>{
            message: "Your session has expired. Please log in again.",
            status: 401,
            code: "session_expired",
          };
        }
      }
    }

   

    const data = await response.json().catch(() => null);

    // If backend indicates email is not verified, throw a specific error
    if (data && data.code === 'email_not_verified') {
      // Throw the exported EmailNotVerifiedError instance so callers can use
      // `instanceof EmailNotVerifiedError` to handle verification state.
      const err = new EmailNotVerifiedError(data?.error || 'Email verification required', data);
      throw err;
    }

    // ❗ Validation error inside a 200 response
    if (
      response.ok &&
      data &&
      (data.success === false || data.code === "validation_error")
    ) {
      const errorsField = data.errors || data.details || null;

      let combinedMessage =
        data?.message || data?.error || data?.detail || undefined;

      if (!combinedMessage && errorsField) {
        combinedMessage = Object.entries(errorsField)
          .map(([field, val]) =>
            Array.isArray(val) ? `${field}: ${val[0]}` : `${field}: ${val}`
          )
          .join("; ");
      }

      const apiError: ApiError = {
        message: combinedMessage || "Validation error",
        status: 400,
        details: data?.details,
        success: false,
        code: data?.code,
        errors: errorsField,
      };

      (apiError as any).response = { data };
      throw apiError;
    }

    // ❗ HTTP ERROR such as 400, 404, 409, 500
    if (!response.ok) {
      const apiError: ApiError = {
        message:
          data?.message || data?.error || data?.detail || "Request failed",
        status: response.status,
        details: data?.details,
        errors: data?.errors,
      };
      (apiError as any).response = { data };
      throw apiError;
    }

    return {
      data,
      status: response.status,
    };
  } catch (err: any) {
    // 🌐 Network errors (connection failed, timeout, etc.) - DO NOT logout
    if (err instanceof TypeError && err.message === "Failed to fetch") {
      // Show a user-friendly notification
      if (globalNotificationHandler) {
        globalNotificationHandler(); // Generic server unavailable message
      }
      
      throw <ApiError>{
        message: "Unable to connect to the server. Please check your internet connection.",
        status: 0,
        code: "network_error",
      };
    }

    // 🔥 Other 5xx errors caught during processing - show banner, don't logout
    if (err.status && err.status >= 500 && err.status < 600) {
      if (globalNotificationHandler) {
        globalNotificationHandler(err.status);
      }
    }

    // Re-throw the error for component-level handling
    throw err;
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
    // Check if data is FormData - if so, don't stringify and let browser set Content-Type
    const isFormData = data instanceof FormData;
    
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? data as FormData : (data ? JSON.stringify(data) : undefined),
      // If FormData, remove Content-Type header to let browser set it with boundary
      ...(isFormData && { headers: { ...options?.headers } }),
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
export { getAccessToken, getRefreshToken, setTokens, clearTokens, logoutUser };

// Export a helper type/class for catching verification errors
// Export a helper class for catching verification errors. Use a global guard
// to avoid "the name X is defined multiple times" errors during Next.js
// hot-reloads where modules may be evaluated multiple times.
// See: https://nextjs.org/docs/messages/duplicate-global
const __globalAny: any = globalThis as any;
if (!__globalAny.__EmailNotVerifiedError) {
  class EmailNotVerifiedErrorClass extends Error {
    response?: any;
    constructor(message: string = 'Email verification required', response?: any) {
      super(message);
      this.name = 'EmailNotVerifiedError';
      this.response = response;
    }
  }

  __globalAny.__EmailNotVerifiedError = EmailNotVerifiedErrorClass;
}

export const EmailNotVerifiedError = __globalAny.__EmailNotVerifiedError as unknown as
  new (message?: string, response?: any) => Error;

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



