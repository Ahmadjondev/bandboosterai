import { apiClient, setTokens, clearTokens } from './api-client';
import type { User, AuthResponse, LoginCredentials, OnboardingData, OnboardingResponse } from '@/types/auth';

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string;
}

/**
 * Fetch current user from backend using JWT token
 */
export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const response = await apiClient.get<User>('/accounts/api/me/');
    if (response.data) {
      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response.data));
      }
      return response.data;
    }
    return null;
  } catch (error: any) {
    // If authentication fails, clear tokens and user data
    if (typeof window !== 'undefined') {
      clearTokens();
      localStorage.removeItem('user');
    }
    return null;
  }
}

/**
 * Login user with credentials and get JWT tokens
 */
export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    const response = await apiClient.post<AuthResponse>('/accounts/api/login/', {
      username: credentials.username,
      password: credentials.password,
    });

    if (response.data) {
      // Store tokens and user data
      if (typeof window !== 'undefined') {
        setTokens(response.data.access, response.data.refresh);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    }

    throw new Error('Login failed');
  } catch (error) {
    throw error;
  }
}

/**
 * Register new user and get JWT tokens
 */
export async function registerUser(data: RegisterData): Promise<AuthResponse> {
  try {
    // Generate username from email if not provided
    const username = data.username || data.email.split('@')[0];

    const response = await apiClient.post<AuthResponse>('/accounts/api/register/', {
      email: data.email,
      password: data.password,
      confirm_password: data.password,
      first_name: data.firstName,
      last_name: data.lastName,
      username: username,
    });

    if (response.data) {
      // Store tokens and user data
      if (typeof window !== 'undefined') {
        setTokens(response.data.access, response.data.refresh);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    }

    throw new Error('Registration failed');
  } catch (error) {
    throw error;
  }
}

/**
 * Logout user and blacklist refresh token
 */
export async function logoutUser(): Promise<void> {
  try {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
    if (refreshToken) {
      await apiClient.post('/accounts/api/logout/', { refresh: refreshToken });
    }
  } catch (error) {
    // Logout anyway even if API call fails
    console.error('Logout error:', error);
  } finally {
    // Clear all tokens and user data
    if (typeof window !== 'undefined') {
      clearTokens();
      localStorage.removeItem('user');
    }
  }
}

/**
 * Get current user from localStorage
 */
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Get auth token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

/**
 * Send verification code to current user's email
 */
export async function sendVerificationCode(): Promise<{ message: string; expires_in_seconds: number }> {
  try {
    const response = await apiClient.post<{ message: string; expires_in_seconds: number }>('/accounts/api/send-verification-code/');
    if (!response.data) {
      throw new Error('No response data');
    }
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Verify email with 4-digit code
 */
export async function verifyCode(code: string): Promise<{ message: string }> {
  try {
    const response = await apiClient.post<{ message: string }>('/accounts/api/verify-code/', {
      code,
    });
    
    if (!response.data) {
      throw new Error('No response data');
    }
    
    // Refresh user data in localStorage if verification successful
    if (typeof window !== 'undefined') {
      try {
        const userResponse = await apiClient.get<User>('/accounts/api/me/');
        if (userResponse.data) {
          localStorage.setItem('user', JSON.stringify(userResponse.data));
        }
      } catch (e) {
        console.error('Failed to refresh user data:', e);
      }
    }
    
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Purchase CD exam for 50,000 UZS
 */
export async function purchaseCDExam(): Promise<{ new_balance: number; amount_paid: number }> {
  try {
    const response = await apiClient.post<{ 
      message: string;
      new_balance: number;
      amount_paid: number;
    }>('/accounts/api/purchase-cd-exam/');
    
    if (!response.data) {
      throw new Error('No response data');
    }
    
    // Update user balance in localStorage
    if (typeof window !== 'undefined') {
      try {
        const userResponse = await apiClient.get<User>('/accounts/api/me/');
        if (userResponse.data) {
          localStorage.setItem('user', JSON.stringify(userResponse.data));
        }
      } catch (e) {
        console.error('Failed to refresh user data:', e);
      }
    }
    
    return {
      new_balance: response.data.new_balance,
      amount_paid: response.data.amount_paid,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Get onboarding status and options
 */
export async function getOnboardingData(): Promise<OnboardingResponse> {
  try {
    const response = await apiClient.get<OnboardingResponse>('/accounts/api/onboarding/');
    if (!response.data) {
      throw new Error('No response data');
    }
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Submit onboarding data
 */
export async function submitOnboarding(data: OnboardingData): Promise<{ message: string; user: User }> {
  try {
    const response = await apiClient.post<{ message: string; user: User }>('/accounts/api/onboarding/', data);
    
    if (!response.data) {
      throw new Error('No response data');
    }
    
    // Update user in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  } catch (error) {
    throw error;
  }
}
