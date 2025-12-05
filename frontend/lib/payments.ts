/**
 * Payment API Functions
 * 
 * Functions for interacting with the payment API endpoints
 */

import { apiClient } from './api-client';
import type {
  SubscriptionPlan,
  AttemptPackage,
  UserPaymentStatus,
  UserAttempts,
  PaymentOrder,
  PaymentHistory,
  AttemptUsageLog,
  AccessCheckResponse,
  UseAttemptResponse,
  AttemptType,
  PromoCodeValidationResponse,
  PaymentOrderWithPromo,
} from '@/types/payment';

const PAYMENTS_BASE = '/payments/api';

/**
 * Get all available subscription plans
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const response = await apiClient.get<SubscriptionPlan[]>(`${PAYMENTS_BASE}/plans/`);
  return response.data ?? [];
}

/**
 * Get all available attempt packages
 */
export async function getAttemptPackages(): Promise<AttemptPackage[]> {
  const response = await apiClient.get<AttemptPackage[]>(`${PAYMENTS_BASE}/packages/`);
  return response.data ?? [];
}

/**
 * Get user's current payment status (subscription + attempts)
 */
export async function getUserPaymentStatus(): Promise<UserPaymentStatus> {
  const response = await apiClient.get<UserPaymentStatus>(`${PAYMENTS_BASE}/status/`);
  if (!response.data) {
    throw new Error('Failed to get payment status');
  }
  return response.data;
}

/**
 * Get user's current attempts balance
 */
export async function getUserAttempts(): Promise<UserAttempts> {
  const response = await apiClient.get<UserAttempts>(`${PAYMENTS_BASE}/attempts/`);
  if (!response.data) {
    throw new Error('Failed to get user attempts');
  }
  return response.data;
}

/**
 * Validate a promo code
 * @param code - The promo code to validate
 * @param planId - Optional plan ID for price calculation
 * @returns Validation result with discount info if valid
 */
export async function validatePromoCode(
  code: string,
  planId?: number
): Promise<PromoCodeValidationResponse> {
  const payload: { code: string; plan_id?: number } = { code };
  if (planId) {
    payload.plan_id = planId;
  }
  
  const response = await apiClient.post<PromoCodeValidationResponse>(
    `${PAYMENTS_BASE}/promo/validate/`,
    payload
  );
  if (!response.data) {
    throw new Error('Failed to validate promo code');
  }
  return response.data;
}

/**
 * Create a subscription order
 * @param planId - The subscription plan ID
 * @param promoCode - Optional promo code to apply
 * @returns Order with checkout URL
 */
export async function createSubscriptionOrder(
  planId: number,
  promoCode?: string
): Promise<PaymentOrderWithPromo> {
  const payload: { plan_id: number; promo_code?: string } = { plan_id: planId };
  if (promoCode) {
    payload.promo_code = promoCode;
  }
  
  const response = await apiClient.post<PaymentOrderWithPromo>(
    `${PAYMENTS_BASE}/orders/subscription/`,
    payload
  );
  if (!response.data) {
    throw new Error('Failed to create subscription order');
  }
  return response.data;
}

/**
 * Create an attempt package order
 * @returns Order with checkout URL
 */
export async function createAttemptOrder(packageId: number): Promise<PaymentOrder> {
  const response = await apiClient.post<PaymentOrder>(
    `${PAYMENTS_BASE}/orders/attempts/`,
    { package_id: packageId }
  );
  if (!response.data) {
    throw new Error('Failed to create attempt order');
  }
  return response.data;
}

/**
 * Get order status
 */
export async function getOrderStatus(orderId: string): Promise<PaymentOrder> {
  const response = await apiClient.get<PaymentOrder>(`${PAYMENTS_BASE}/orders/${orderId}/`);
  if (!response.data) {
    throw new Error('Failed to get order status');
  }
  return response.data;
}

/**
 * Get checkout URL for an existing order
 */
export async function getCheckoutUrl(orderId: string): Promise<{ checkout_url: string }> {
  const response = await apiClient.get<{ checkout_url: string }>(
    `${PAYMENTS_BASE}/orders/${orderId}/checkout/`
  );
  if (!response.data) {
    throw new Error('Failed to get checkout URL');
  }
  return response.data;
}

/**
 * Get payment history
 */
export async function getPaymentHistory(): Promise<PaymentHistory[]> {
  const response = await apiClient.get<PaymentHistory[]>(`${PAYMENTS_BASE}/history/`);
  return response.data ?? [];
}

/**
 * Get attempt usage history
 */
export async function getAttemptUsageHistory(): Promise<AttemptUsageLog[]> {
  const response = await apiClient.get<AttemptUsageLog[]>(`${PAYMENTS_BASE}/usage-history/`);
  return response.data ?? [];
}

/**
 * Use an attempt
 */
export async function useAttempt(
  type: AttemptType,
  contentType?: string,
  contentId?: number
): Promise<UseAttemptResponse> {
  const response = await apiClient.post<UseAttemptResponse>(
    `${PAYMENTS_BASE}/use-attempt/`,
    {
      type,
      content_type: contentType,
      content_id: contentId,
    }
  );
  if (!response.data) {
    throw new Error('Failed to use attempt');
  }
  return response.data;
}

/**
 * Check if user has access to premium content
 */
export async function checkAccess(
  type: AttemptType | 'BOOK',
  contentId?: number
): Promise<AccessCheckResponse> {
  const response = await apiClient.post<AccessCheckResponse>(
    `${PAYMENTS_BASE}/check-access/`,
    {
      type,
      content_id: contentId,
    }
  );
  if (!response.data) {
    throw new Error('Failed to check access');
  }
  return response.data;
}

/**
 * Quick check for writing access
 */
export async function checkWritingAccess(): Promise<{ has_access: boolean; attempts_remaining: number }> {
  const response = await apiClient.get<{ has_access: boolean; attempts_remaining: number }>(
    `${PAYMENTS_BASE}/check/writing/`
  );
  if (!response.data) {
    throw new Error('Failed to check writing access');
  }
  return response.data;
}

/**
 * Quick check for speaking access
 */
export async function checkSpeakingAccess(): Promise<{ has_access: boolean; attempts_remaining: number }> {
  const response = await apiClient.get<{ has_access: boolean; attempts_remaining: number }>(
    `${PAYMENTS_BASE}/check/speaking/`
  );
  if (!response.data) {
    throw new Error('Failed to check speaking access');
  }
  return response.data;
}

/**
 * Redirect to Payme checkout
 */
export function redirectToPayme(checkoutUrl: string): void {
  if (typeof window !== 'undefined') {
    window.location.href = checkoutUrl;
  }
}

/**
 * Open Payme checkout in a new tab
 */
export function openPaymeCheckout(checkoutUrl: string): void {
  if (typeof window !== 'undefined') {
    window.open(checkoutUrl, '_blank');
  }
}
