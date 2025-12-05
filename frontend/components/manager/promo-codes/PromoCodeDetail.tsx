'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Tag,
  Edit2,
  Clock,
  Users,
  DollarSign,
  Percent,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Hash,
} from 'lucide-react';
import { managerAPI } from '@/lib/manager/api-client';
import type { PromoCodeWithUsages } from '@/types/manager/promo-codes';
import { LoadingSpinner } from '@/components/manager/shared';
import { cn } from '@/lib/manager/utils';

interface PromoCodeDetailProps {
  promoId: number;
  onClose: () => void;
  onEdit: () => void;
}

export function PromoCodeDetail({ promoId, onClose, onEdit }: PromoCodeDetailProps) {
  const [promo, setPromo] = useState<PromoCodeWithUsages | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPromo = async () => {
      try {
        setLoading(true);
        const data = await managerAPI.getPromoCode(promoId);
        setPromo(data);
      } catch (error) {
        console.error('Error fetching promo code:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPromo();
  }, [promoId]);

  const getStatusBadge = () => {
    if (!promo) return null;
    
    if (!promo.is_active) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          <XCircle className="w-4 h-4" />
          Inactive
        </span>
      );
    }
    if (!promo.is_currently_valid) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          <AlertCircle className="w-4 h-4" />
          Expired
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        <CheckCircle className="w-4 h-4" />
        Active
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Promo Code Details
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : promo ? (
            <div className="space-y-6">
              {/* Code & Status */}
              <div className="flex items-center justify-between">
                <div>
                  <code className="text-3xl font-mono font-bold text-gray-900 dark:text-white px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    {promo.code}
                  </code>
                  {promo.description && (
                    <p className="text-gray-600 dark:text-gray-400 mt-2">{promo.description}</p>
                  )}
                </div>
                {getStatusBadge()}
              </div>

              {/* Discount Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                    {promo.discount_type === 'PERCENTAGE' ? (
                      <Percent className="w-4 h-4" />
                    ) : (
                      <DollarSign className="w-4 h-4" />
                    )}
                    <span className="text-sm">Discount</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {promo.discount_type === 'PERCENTAGE' 
                      ? `${promo.discount_value}%`
                      : `${promo.discount_value.toLocaleString()} UZS`}
                  </p>
                  {promo.discount_type === 'PERCENTAGE' && promo.max_discount_amount && (
                    <p className="text-xs text-gray-500 mt-1">
                      Max: {promo.max_discount_amount.toLocaleString()} UZS
                    </p>
                  )}
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Usage</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {promo.times_used}
                    {promo.usage_limit && (
                      <span className="text-gray-500 text-lg">/{promo.usage_limit}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {promo.usage_limit_per_user} use(s) per user
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Validity</span>
                  </div>
                  {promo.valid_until ? (
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      Until {new Date(promo.valid_until).toLocaleDateString()}
                    </p>
                  ) : (
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">No expiry</p>
                  )}
                  {promo.valid_from && (
                    <p className="text-xs text-gray-500 mt-1">
                      From {new Date(promo.valid_from).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Analytics */}
              {promo.usage_analytics && (
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Performance Analytics
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Uses</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {promo.usage_analytics.total_uses}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Discount Given</p>
                      <p className="text-2xl font-bold text-primary">
                        {promo.usage_analytics.total_discount_given.toLocaleString()} <span className="text-sm">UZS</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Revenue Generated</p>
                      <p className="text-2xl font-bold text-green-600">
                        {promo.usage_analytics.total_revenue_generated.toLocaleString()} <span className="text-sm">UZS</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Applicable Plans */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Applicable Plans
                </h3>
                {promo.applicable_plans_info.all_plans ? (
                  <p className="text-gray-600 dark:text-gray-400">All subscription plans</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {promo.applicable_plans_info.plans.map((plan) => (
                      <span
                        key={plan.id}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm"
                      >
                        {plan.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Info */}
              {promo.min_purchase_amount > 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Minimum purchase:</span> {promo.min_purchase_amount.toLocaleString()} UZS
                </div>
              )}

              {/* Recent Usages */}
              {promo.recent_usages && promo.recent_usages.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Recent Usage History
                  </h3>
                  <div className="space-y-2">
                    {promo.recent_usages.map((usage, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {usage.user_info.full_name || usage.user_info.username}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(usage.used_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600 dark:text-green-400">
                            -{usage.discount_amount.toLocaleString()} UZS
                          </p>
                          <p className="text-xs text-gray-500">
                            Paid: {usage.final_amount.toLocaleString()} UZS
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="text-xs text-gray-500 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p>Created: {new Date(promo.created_at).toLocaleString()}</p>
                <p>Last updated: {new Date(promo.updated_at).toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">Failed to load promo code details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
