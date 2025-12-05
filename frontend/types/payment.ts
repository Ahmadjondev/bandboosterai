/**
 * Payment and Subscription Types
 */

export interface SubscriptionPlan {
  id: number;
  name: string;
  plan_type: 'PLUS' | 'PRO' | 'ULTRA';
  description: string | null;
  price: number;
  price_formatted: string;
  billing_period: 'MONTHLY' | 'QUARTERLY' | 'BIANNUAL' | 'YEARLY';
  writing_attempts: number;
  speaking_attempts: number;
  reading_attempts: number;
  listening_attempts: number;
  cd_exam_attempts: number;
  // Whether each section has unlimited access (-1 in backend)
  reading_unlimited: boolean;
  listening_unlimited: boolean;
  writing_unlimited: boolean;
  speaking_unlimited: boolean;
  book_access: boolean;
  features: string[];
  is_popular: boolean;
}

export interface UserSubscription {
  id: number;
  plan: SubscriptionPlan | null;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING';
  started_at: string | null;
  expires_at: string | null;
  auto_renew: boolean;
  is_valid: boolean;
  days_remaining: number;
}

export interface UserAttempts {
  writing_attempts: number;
  speaking_attempts: number;
  reading_attempts: number;
  listening_attempts: number;
  total_attempts: number;
  last_reset_date: string | null;
}

export interface AttemptPackage {
  id: number;
  name: string;
  attempt_type: 'WRITING' | 'SPEAKING' | 'READING' | 'LISTENING' | 'MIXED';
  description: string | null;
  attempts_count: number;
  writing_attempts: number;
  speaking_attempts: number;
  reading_attempts: number;
  listening_attempts: number;
  price: number;
  price_formatted: string;
}

export interface PaymentOrder {
  order_id: string;
  order_type: 'SUBSCRIPTION' | 'ATTEMPTS';
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED';
  subscription_plan: SubscriptionPlan | null;
  attempt_package: AttemptPackage | null;
  amount: number;
  amount_formatted: string;
  expires_at: string;
  is_expired: boolean;
  created_at: string;
  paid_at: string | null;
  checkout_url?: string;
}

export interface UserPaymentStatus {
  subscription: UserSubscription | null;
  attempts: UserAttempts;
  has_active_subscription: boolean;
  can_access_premium_books: boolean;
}

export interface AttemptUsageLog {
  usage_type: 'WRITING' | 'SPEAKING' | 'READING' | 'LISTENING';
  usage_type_display: string;
  content_type: string | null;
  content_id: number | null;
  used_at: string;
}

export interface PaymentHistory {
  order_id: string;
  order_type: 'SUBSCRIPTION' | 'ATTEMPTS';
  order_type_display: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED';
  status_display: string;
  amount: number;
  created_at: string;
  paid_at: string | null;
}

export interface AccessCheckResponse {
  has_access: boolean;
  attempts_remaining?: number;
  reason: string;
}

export interface UseAttemptResponse {
  success: boolean;
  attempts_remaining: number;
  type: string;
  attempts: UserAttempts;
}

export type AttemptType = 'WRITING' | 'SPEAKING' | 'READING' | 'LISTENING';

/**
 * Promo Code Types
 */

export interface PromoCodeValidationResponse {
  valid: boolean;
  message: string;
  code?: string;
  discount_type?: 'PERCENTAGE' | 'FIXED';
  discount_value?: number;
  discount_amount?: number;
  original_amount?: number;
  final_amount?: number;
}

export interface PromoCodeApplied {
  code: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  discount_amount: number;
  original_amount: number;
  final_amount: number;
}

export interface PaymentOrderWithPromo extends PaymentOrder {
  original_amount: number | null;
  original_amount_formatted: string | null;
  discount_amount: number;
  discount_amount_formatted: string | null;
  promo_code_display: string | null;
}
