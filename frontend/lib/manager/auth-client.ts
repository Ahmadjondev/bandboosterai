/**
 * Authentication Client for Manager Panel
 * Handles JWT authentication with Django backend
 */

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    phone?: string;
    is_active: boolean;
    email_verified: boolean;
  };
  access: string;
  refresh: string;
}

export interface AuthError {
  error?: string;
  detail?: string;
  username?: string[];
  password?: string[];
}

class AuthClient {
  private baseURL: string;

  constructor() {
    // Use direct Django URL instead of Next.js proxy
    this.baseURL = 'http://localhost:8001/accounts/api';
  }

  /**
   * Login with username/email and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await fetch(`${this.baseURL}/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.detail || 'Login failed');
    }

    // Store tokens in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));
    }

    return data;
  }

  /**
   * Logout and blacklist refresh token
   */
  async logout(): Promise<void> {
    const refreshToken = typeof window !== 'undefined' 
      ? localStorage.getItem('refresh_token') 
      : null;

    if (refreshToken) {
      try {
        await fetch(`${this.baseURL}/logout/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify({ refresh: refreshToken }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    // Clear all auth data from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<string | null> {
    const refreshToken = typeof window !== 'undefined' 
      ? localStorage.getItem('refresh_token') 
      : null;

    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseURL}/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      // Store new access token
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', data.access);
        
        // If a new refresh token is provided, store it too
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

  /**
   * Get current user info from localStorage
   */
  getCurrentUser(): LoginResponse['user'] | null {
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
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('access_token');
  }

  /**
   * Check if user has manager or superadmin role
   */
  isManager(): boolean {
    const user = this.getCurrentUser();
    return user ? ['MANAGER', 'SUPERADMIN'].includes(user.role) : false;
  }

  /**
   * Get access token from localStorage
   */
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  }
}

// Create singleton instance
export const authClient = new AuthClient();

// Export for default import
export default authClient;
