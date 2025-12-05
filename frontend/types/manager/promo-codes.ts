/**
 * Promo Code Management Types for Manager Panel
 */

export interface PromoCode {
  id: number;
  code: string;
  description: string | null;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  discount_display: string;
  applicable_plans: number[];
  applicable_plans_info: {
    all_plans: boolean;
    plans: Array<{
      id: number;
      name: string;
      plan_type: string;
    }>;
  };
  min_purchase_amount: number;
  max_discount_amount: number | null;
  usage_limit: number | null;
  usage_limit_per_user: number;
  times_used: number;
  usage_stats: {
    times_used: number;
    limit: number | null;
    remaining: number | null;
  };
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  is_currently_valid: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromoCodeForm {
  code: string;
  description?: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  applicable_plans?: number[];
  min_purchase_amount?: number;
  max_discount_amount?: number | null;
  usage_limit?: number | null;
  usage_limit_per_user?: number;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active?: boolean;
}

export interface PromoCodeUsage {
  id: number;
  promo_code_display: string;
  user_info: {
    id: number;
    username: string;
    full_name: string;
  };
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  used_at: string;
}

export interface PromoCodeWithUsages extends PromoCode {
  recent_usages: PromoCodeUsage[];
  usage_analytics: {
    total_uses: number;
    total_discount_given: number;
    total_revenue_generated: number;
  };
}

export interface PromoCodeStats {
  total_codes: number;
  active_codes: number;
  total_usages: number;
  total_discount_given: number;
}

export interface PromoCodesResponse {
  promo_codes: PromoCode[];
  stats: PromoCodeStats;
}

export interface PromoCodeAnalytics {
  overview: {
    total_codes: number;
    active_codes: number;
    inactive_codes: number;
  };
  usage_stats: {
    total_usages: number;
    usages_last_7_days: number;
    usages_last_30_days: number;
  };
  revenue_stats: {
    total_discount_given: number;
    total_revenue_from_promos: number;
    original_value: number;
  };
  top_performing_codes: Array<{
    id: number;
    code: string;
    times_used: number;
    discount_type: string;
    discount_value: number;
  }>;
  recent_usages: PromoCodeUsage[];
}

export interface AvailablePlan {
  id: number;
  name: string;
  plan_type: string;
  price: number;
  billing_period: string;
}

export type PromoCodeFilter = 'all' | 'active' | 'inactive' | 'expired';
