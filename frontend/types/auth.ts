export interface User {
  id: number;
  username: string;
  email: string;
  role: 'SUPERADMIN' | 'MANAGER' | 'STUDENT';
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
  profile_image?: string;
  email_verified: boolean;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  access: string;
  refresh: string;
  message?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string;
}
