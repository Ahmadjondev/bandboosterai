/**
 * Reading Tests API Client
 * API functions for reading passages, test heads, and questions
 * Uses JWT authentication from localStorage
 */

import type {
  ReadingPassage,
  TestHead,
  Question,
  PassagesResponse,
  TestHeadsResponse,
  TestHeadResponse,
  PassageResponse,
  BulkCreateResponse,
} from '@/types/reading';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001';

// Helper function to get JWT token from localStorage
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

// Helper function to refresh access token
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = typeof window !== 'undefined' 
    ? localStorage.getItem('refresh_token') 
    : null;

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch('http://localhost:8001/accounts/api/token/refresh/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      // Refresh token is invalid, redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/manager/login';
      }
      return null;
    }

    const data = await response.json();
    
    // Store new access token
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', data.access);
      if (data.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
      }
    }

    return data.access;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

// Helper function for API requests with JWT authentication
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  let accessToken = getAccessToken();
  
  // If no access token, redirect to login
  if (!accessToken && typeof window !== 'undefined') {
    window.location.href = '/manager/login';
    throw new Error('Not authenticated');
  }

  // Optional debug logging: set localStorage.setItem('api_debug', '1') to enable
  const debugEnabled = typeof window !== 'undefined' && localStorage.getItem('api_debug') === '1';

  const maskToken = (t: string | null) => {
    if (!t) return null;
    if (t.length <= 10) return '*****';
    return `${t.slice(0, 6)}...${t.slice(-4)}`;
  };

  const makeRequest = async (token: string | null) => {
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add JWT token to Authorization header
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    if (debugEnabled) {
      // eslint-disable-next-line no-console
      console.debug('[apiRequest] ->', { url, method: options.method || 'GET', token: maskToken(token) });
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    return response;
  };

  let response = await makeRequest(accessToken);

  // If unauthorized, try to refresh token
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await makeRequest(newToken);
    } else {
      throw new Error('Authentication failed');
    }
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.detail || `API error: ${response.statusText}`);
    }

    // Non-JSON error body (likely HTML login page or server error page)
    const text = await response.text().catch(() => null);
    throw new Error(
      `API returned status ${response.status} with non-JSON response: ${
        text ? text.slice(0, 1000) : 'no response body'
      }`
    );
  }

  // Ensure we only parse JSON responses
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text().catch(() => null);
  throw new Error(
    `Expected JSON but server returned non-JSON response: ${text ? text.slice(0, 1000) : 'no response body'}`
  );
}

// Reading Passages

export async function getReadingPassages(params?: {
  page?: number;
  per_page?: number;
}): Promise<PassagesResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.per_page) searchParams.append('per_page', params.per_page.toString());

  return apiRequest<PassagesResponse>(
    `/manager/api/tests/reading/?${searchParams.toString()}`
  );
}

export async function getReadingPassage(id: number): Promise<PassageResponse> {
  return apiRequest<PassageResponse>(`/manager/api/tests/reading/${id}/`);
}

export async function createReadingPassage(data: Partial<ReadingPassage>): Promise<PassageResponse> {
  return apiRequest<PassageResponse>('/manager/api/tests/reading/create/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateReadingPassage(
  id: number,
  data: Partial<ReadingPassage>
): Promise<PassageResponse> {
  return apiRequest<PassageResponse>(`/manager/api/tests/reading/${id}/update/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteReadingPassage(id: number): Promise<void> {
  return apiRequest<void>(`/manager/api/tests/reading/${id}/delete/`, {
    method: 'DELETE',
  });
}

// Test Heads

export async function getTestHeads(params?: {
  passage_id?: number;
  part_id?: number;
}): Promise<TestHeadsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.passage_id) searchParams.append('passage_id', params.passage_id.toString());
  if (params?.part_id) searchParams.append('part_id', params.part_id.toString());

  return apiRequest<TestHeadsResponse>(`/manager/api/tests/testheads/?${searchParams.toString()}`);
}

export async function getTestHead(id: number): Promise<TestHeadResponse> {
  return apiRequest<TestHeadResponse>(`/manager/api/tests/testhead/${id}/`);
}

export async function createTestHead(data: Partial<TestHead>): Promise<TestHeadResponse> {
  return apiRequest<TestHeadResponse>('/manager/api/tests/testhead/create/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createTestHeadWithFile(formData: FormData): Promise<TestHeadResponse> {
  const accessToken = getAccessToken();
  
  if (!accessToken && typeof window !== 'undefined') {
    window.location.href = '/manager/login';
    throw new Error('Not authenticated');
  }

  const makeRequest = async (token: string | null) => {
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

  const response = await fetch(`${API_BASE_URL}/manager/api/tests/testhead/create/`, {
      method: 'POST',
      headers,
      body: formData,
    });

    return response;
  };

  let response = await makeRequest(accessToken);

  // If unauthorized, try to refresh token
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await makeRequest(newToken);
    } else {
      throw new Error('Authentication failed');
    }
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.statusText}`);
    }

    const text = await response.text().catch(() => null);
    throw new Error(
      `API returned status ${response.status} with non-JSON response: ${text ? text.slice(0, 1000) : 'no response body'}`
    );
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text().catch(() => null);
  throw new Error(
    `Expected JSON but server returned non-JSON response: ${text ? text.slice(0, 1000) : 'no response body'}`
  );
}

export async function updateTestHead(
  id: number,
  data: Partial<TestHead>
): Promise<TestHeadResponse> {
  return apiRequest<TestHeadResponse>(`/manager/api/tests/testhead/${id}/update/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updateTestHeadWithFile(
  id: number,
  formData: FormData
): Promise<TestHeadResponse> {
  const accessToken = getAccessToken();
  
  if (!accessToken && typeof window !== 'undefined') {
    window.location.href = '/manager/login';
    throw new Error('Not authenticated');
  }

  const makeRequest = async (token: string | null) => {
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

  const response = await fetch(`${API_BASE_URL}/manager/api/tests/testhead/${id}/update/`, {
      method: 'PUT',
      headers,
      body: formData,
    });

    return response;
  };

  let response = await makeRequest(accessToken);

  // If unauthorized, try to refresh token
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await makeRequest(newToken);
    } else {
      throw new Error('Authentication failed');
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteTestHead(id: number): Promise<void> {
  return apiRequest<void>(`/manager/api/tests/testhead/${id}/delete/`, {
    method: 'DELETE',
  });
}

// Questions

export async function createQuestionsBulk(data: {
  testhead: number;
  questions?: Question[];
  matching_data?: any;
}): Promise<BulkCreateResponse> {
  return apiRequest<BulkCreateResponse>('/manager/api/tests/questions/bulk-create/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateQuestion(id: number, data: Partial<Question>): Promise<Question> {
  return apiRequest<Question>(`/manager/api/tests/question/${id}/update/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteQuestion(id: number): Promise<void> {
  return apiRequest<void>(`/manager/api/tests/question/${id}/delete/`, {
    method: 'DELETE',
  });
}

// Export all as a single object for backwards compatibility
export const API = {
  getReadingPassages,
  getReadingPassage,
  createReadingPassage,
  updateReadingPassage,
  deleteReadingPassage,
  getTestHeads,
  getTestHead,
  createTestHead,
  createTestHeadWithFile,
  updateTestHead,
  updateTestHeadWithFile,
  deleteTestHead,
  createQuestionsBulk,
  updateQuestion,
  deleteQuestion,
  request: apiRequest,
};
