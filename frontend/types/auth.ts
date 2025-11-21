export interface User {
  id: number;
  username: string;
  email: string;
  role: 'MANAGER' | 'STUDENT' | 'TEACHER';
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
  profile_image?: string;
  is_verified: boolean;
  google_id?: string;
  registration_method?: 'EMAIL' | 'TELEGRAM' | 'GOOGLE';
  balance?: number;
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
