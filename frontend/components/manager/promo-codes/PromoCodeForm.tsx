'use client';

import { useState, useEffect } from 'react';
import { X, Tag, Percent, DollarSign, Calendar, Users, Check } from 'lucide-react';
import { managerAPI } from '@/lib/manager/api-client';
import type { PromoCode, PromoCodeForm as PromoCodeFormData, AvailablePlan } from '@/types/manager/promo-codes';
import { cn } from '@/lib/manager/utils';

interface PromoCodeFormProps {
  promo?: PromoCode | null;
  plans: AvailablePlan[];
  onClose: () => void;
  onSuccess: () => void;
}

export function PromoCodeForm({ promo, plans, onClose, onSuccess }: PromoCodeFormProps) {
  const isEditing = !!promo;
  
  const [formData, setFormData] = useState<PromoCodeFormData>({
    code: '',
    description: '',
    discount_type: 'PERCENTAGE',
    discount_value: 10,
    applicable_plans: [],
    min_purchase_amount: 0,
    max_discount_amount: null,
    usage_limit: null,
    usage_limit_per_user: 1,
    valid_from: null,
    valid_until: null,
    is_active: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (promo) {
      setFormData({
        code: promo.code,
        description: promo.description || '',
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        applicable_plans: promo.applicable_plans || [],
        min_purchase_amount: promo.min_purchase_amount || 0,
        max_discount_amount: promo.max_discount_amount,
        usage_limit: promo.usage_limit,
        usage_limit_per_user: promo.usage_limit_per_user || 1,
        valid_from: promo.valid_from ? promo.valid_from.split('T')[0] : null,
        valid_until: promo.valid_until ? promo.valid_until.split('T')[0] : null,
        is_active: promo.is_active,
      });
    }
  }, [promo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.code.trim()) {
      setError('Promo code is required');
      return;
    }
    if (formData.discount_value <= 0) {
      setError('Discount value must be greater than 0');
      return;
    }
    if (formData.discount_type === 'PERCENTAGE' && formData.discount_value > 100) {
      setError('Percentage discount cannot exceed 100%');
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        ...formData,
        code: formData.code.toUpperCase().trim(),
        valid_from: formData.valid_from ? `${formData.valid_from}T00:00:00Z` : null,
        valid_until: formData.valid_until ? `${formData.valid_until}T23:59:59Z` : null,
      };

      if (isEditing && promo) {
        await managerAPI.updatePromoCode(promo.id, payload);
      } else {
        await managerAPI.createPromoCode(payload);
      }
      
      onSuccess();
    } catch (err: unknown) {
      console.error('Error saving promo code:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save promo code';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanToggle = (planId: number) => {
    setFormData((prev) => ({
      ...prev,
      applicable_plans: prev.applicable_plans?.includes(planId)
        ? prev.applicable_plans.filter((id) => id !== planId)
        : [...(prev.applicable_plans || []), planId],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            {isEditing ? 'Edit Promo Code' : 'Create Promo Code'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Code & Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Promo Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., SUMMER20"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary font-mono uppercase"
                  disabled={isEditing}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {isEditing ? 'Code cannot be changed after creation' : 'Letters, numbers, and underscores only'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Internal description"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
            </div>

            {/* Discount Type & Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Discount *
              </label>
              <div className="flex gap-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, discount_type: 'PERCENTAGE' })}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
                      formData.discount_type === 'PERCENTAGE'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900'
                    )}
                  >
                    <Percent className="w-4 h-4" />
                    Percentage
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, discount_type: 'FIXED' })}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
                      formData.discount_type === 'FIXED'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900'
                    )}
                  >
                    <DollarSign className="w-4 h-4" />
                    Fixed Amount
                  </button>
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                      min="0"
                      max={formData.discount_type === 'PERCENTAGE' ? 100 : undefined}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                      {formData.discount_type === 'PERCENTAGE' ? '%' : 'UZS'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Max Discount (for percentage) */}
            {formData.discount_type === 'PERCENTAGE' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Maximum Discount Amount (optional)
                </label>
                <div className="relative max-w-xs">
                  <input
                    type="number"
                    value={formData.max_discount_amount || ''}
                    onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="No limit"
                    min="0"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary pr-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">UZS</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Cap the discount amount for percentage discounts</p>
              </div>
            )}

            {/* Applicable Plans */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Applicable Plans
              </label>
              <div className="flex flex-wrap gap-2">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => handlePlanToggle(plan.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors',
                      formData.applicable_plans?.includes(plan.id)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900'
                    )}
                  >
                    {formData.applicable_plans?.includes(plan.id) && <Check className="w-3 h-3" />}
                    {plan.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to apply to all plans
              </p>
            </div>

            {/* Usage Limits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Total Usage Limit
                </label>
                <input
                  type="number"
                  value={formData.usage_limit || ''}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Unlimited"
                  min="1"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Uses Per User
                </label>
                <input
                  type="number"
                  value={formData.usage_limit_per_user}
                  onChange={(e) => setFormData({ ...formData, usage_limit_per_user: parseInt(e.target.value) || 1 })}
                  min="1"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
            </div>

            {/* Validity Period */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Valid From
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={formData.valid_from || ''}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value || null })}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Valid Until
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={formData.valid_until || ''}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value || null })}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Min Purchase */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Minimum Purchase Amount
              </label>
              <div className="relative max-w-xs">
                <input
                  type="number"
                  value={formData.min_purchase_amount}
                  onChange={(e) => setFormData({ ...formData, min_purchase_amount: parseFloat(e.target.value) || 0 })}
                  min="0"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary pr-12"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">UZS</span>
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                className={cn(
                  'relative w-12 h-6 rounded-full transition-colors',
                  formData.is_active ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                    formData.is_active ? 'translate-x-7' : 'translate-x-1'
                  )}
                />
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {formData.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {isEditing ? 'Update' : 'Create'} Promo Code
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
