import type { UserAttempts, UserSubscription } from './payment';

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
  // Payment related fields
  attempts?: UserAttempts;
  subscription?: UserSubscription;
  // Onboarding fields
  target_score?: string;
  exam_type?: 'ACADEMIC' | 'GENERAL' | 'UKVI';
  exam_date?: string;
  heard_from?: 'GOOGLE' | 'SOCIAL_MEDIA' | 'FRIEND' | 'YOUTUBE' | 'TELEGRAM' | 'OTHER';
  main_goal?: 'STUDY_ABROAD' | 'IMMIGRATION' | 'WORK' | 'PERSONAL' | 'OTHER';
  onboarding_completed?: boolean;
}

export interface OnboardingData {
  date_of_birth?: string;
  target_score?: string;
  exam_type?: string;
  exam_date?: string;
  heard_from?: string;
  main_goal?: string;
}

export interface OnboardingOption {
  value: string;
  label: string;
}

export interface OnboardingOptions {
  exam_types: OnboardingOption[];
  heard_from: OnboardingOption[];
  goals: OnboardingOption[];
  target_scores: OnboardingOption[];
}

export interface OnboardingResponse {
  onboarding_completed: boolean;
  current_data: OnboardingData;
  options: OnboardingOptions;
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
