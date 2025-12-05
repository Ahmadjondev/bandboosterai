'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Tag,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Eye,
  Copy,
  Check,
  TrendingUp,
  Users,
  DollarSign,
  Percent,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { managerAPI } from '@/lib/manager/api-client';
import type {
  PromoCode,
  PromoCodeStats,
  PromoCodeFilter,
  AvailablePlan,
} from '@/types/manager/promo-codes';
import { PromoCodeForm } from '@/components/manager/promo-codes/PromoCodeForm';
import { PromoCodeDetail } from '@/components/manager/promo-codes/PromoCodeDetail';
import { LoadingSpinner } from '@/components/manager/shared';
import { cn } from '@/lib/manager/utils';

export default function PromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [stats, setStats] = useState<PromoCodeStats | null>(null);
  const [plans, setPlans] = useState<AvailablePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PromoCodeFilter>('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [viewingPromo, setViewingPromo] = useState<PromoCode | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null);

  const fetchPromoCodes = useCallback(async () => {
    try {
      setLoading(true);
      const [promoData, plansData] = await Promise.all([
        managerAPI.getPromoCodes(filter, search || undefined),
        managerAPI.getAvailablePlans(),
      ]);
      setPromoCodes(promoData.promo_codes);
      setStats(promoData.stats);
      setPlans(plansData);
    } catch (error) {
      console.error('Error fetching promo codes:', error);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    fetchPromoCodes();
  }, [fetchPromoCodes]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchPromoCodes();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, fetchPromoCodes]);

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleStatus = async (promo: PromoCode) => {
    try {
      await managerAPI.togglePromoCodeStatus(promo.id);
      fetchPromoCodes();
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to toggle promo code status');
    }
  };

  const handleDelete = async (promo: PromoCode) => {
    if (promo.times_used > 0) {
      alert('Cannot delete a promo code that has been used. Consider deactivating it instead.');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete promo code "${promo.code}"?`)) {
      return;
    }

    try {
      await managerAPI.deletePromoCode(promo.id);
      fetchPromoCodes();
    } catch (error) {
      console.error('Error deleting promo code:', error);
      alert('Failed to delete promo code');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingPromo(null);
    fetchPromoCodes();
  };

  const getStatusBadge = (promo: PromoCode) => {
    if (!promo.is_active) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          <XCircle className="w-3 h-3" />
          Inactive
        </span>
      );
    }
    if (!promo.is_currently_valid) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          <AlertCircle className="w-3 h-3" />
          Expired
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        <CheckCircle className="w-3 h-3" />
        Active
      </span>
    );
  };

  const formatDiscount = (promo: PromoCode) => {
    if (promo.discount_type === 'PERCENTAGE') {
      return `${promo.discount_value}%`;
    }
    return `${promo.discount_value.toLocaleString()} UZS`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Tag className="w-7 h-7 text-primary" />
            Promo Codes
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage promotional codes and discounts
          </p>
        </div>
        <button
          onClick={() => {
            setEditingPromo(null);
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Create Promo Code
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Codes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_codes}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Codes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active_codes}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Uses</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_usages}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Discount Given</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.total_discount_given.toLocaleString()} <span className="text-sm font-normal">UZS</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by code or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            {(['all', 'active', 'inactive', 'expired'] as PromoCodeFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize',
                  filter === f
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Promo Codes List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : promoCodes.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              No promo codes found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {search || filter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first promo code to get started'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Discount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Validity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {promoCodes.map((promo) => (
                  <tr key={promo.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono font-semibold text-gray-900 dark:text-white">
                          {promo.code}
                        </code>
                        <button
                          onClick={() => handleCopyCode(promo.code)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="Copy code"
                        >
                          {copiedCode === promo.code ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {promo.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-[200px]">
                          {promo.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        {promo.discount_type === 'PERCENTAGE' ? (
                          <Percent className="w-4 h-4 text-blue-500" />
                        ) : (
                          <DollarSign className="w-4 h-4 text-green-500" />
                        )}
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatDiscount(promo)}
                        </span>
                      </div>
                      {promo.applicable_plans_info.all_plans ? (
                        <span className="text-xs text-gray-500">All plans</span>
                      ) : (
                        <span className="text-xs text-gray-500">
                          {promo.applicable_plans_info.plans.length} plan(s)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {promo.times_used}
                        </span>
                        {promo.usage_limit && (
                          <span className="text-gray-500">/{promo.usage_limit}</span>
                        )}
                        <span className="text-gray-500"> uses</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {promo.usage_limit_per_user}/user
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      {promo.valid_until ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">
                            Until {new Date(promo.valid_until).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No expiry</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(promo)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="relative">
                        <button
                          onClick={() => setActionMenuOpen(actionMenuOpen === promo.id ? null : promo.id)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-500" />
                        </button>
                        
                        {actionMenuOpen === promo.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActionMenuOpen(null)}
                            />
                            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                              <button
                                onClick={() => {
                                  setViewingPromo(promo);
                                  setActionMenuOpen(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </button>
                              <button
                                onClick={() => {
                                  setEditingPromo(promo);
                                  setShowForm(true);
                                  setActionMenuOpen(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Edit2 className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  handleToggleStatus(promo);
                                  setActionMenuOpen(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                {promo.is_active ? (
                                  <>
                                    <ToggleLeft className="w-4 h-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <ToggleRight className="w-4 h-4" />
                                    Activate
                                  </>
                                )}
                              </button>
                              <hr className="my-1 border-gray-200 dark:border-gray-700" />
                              <button
                                onClick={() => {
                                  handleDelete(promo);
                                  setActionMenuOpen(null);
                                }}
                                disabled={promo.times_used > 0}
                                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <PromoCodeForm
          promo={editingPromo}
          plans={plans}
          onClose={() => {
            setShowForm(false);
            setEditingPromo(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Detail Modal */}
      {viewingPromo && (
        <PromoCodeDetail
          promoId={viewingPromo.id}
          onClose={() => setViewingPromo(null)}
          onEdit={() => {
            setEditingPromo(viewingPromo);
            setViewingPromo(null);
            setShowForm(true);
          }}
        />
      )}
    </div>
  );
}
