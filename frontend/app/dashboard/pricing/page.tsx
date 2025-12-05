'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Check, 
  Zap, 
  Crown, 
  Star, 
  Sparkles, 
  ArrowRight, 
  Package, 
  Tag, 
  X, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Flame,
  Shield,
  BookOpen,
  Mic,
  PenTool,
  Headphones,
  BookMarked,
  TrendingUp
} from 'lucide-react';
import {
  getSubscriptionPlans,
  getAttemptPackages,
  getUserPaymentStatus,
  createSubscriptionOrder,
  createAttemptOrder,
  redirectToPayme,
  validatePromoCode,
} from '@/lib/payments';
import type { SubscriptionPlan, AttemptPackage, UserPaymentStatus, PromoCodeApplied } from '@/types/payment';

type BillingPeriod = 'MONTHLY' | 'QUARTERLY' | 'BIANNUAL' | 'YEARLY';

const BILLING_PERIODS: { value: BillingPeriod; label: string; shortLabel: string; discount?: number }[] = [
  { value: 'MONTHLY', label: '1 Month', shortLabel: '1M' },
  { value: 'QUARTERLY', label: '3 Months', shortLabel: '3M', discount: 10 },
  { value: 'BIANNUAL', label: '6 Months', shortLabel: '6M', discount: 20 },
  { value: 'YEARLY', label: '12 Months', shortLabel: '1Y', discount: 30 },
];

export default function PricingPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [packages, setPackages] = useState<AttemptPackage[]>([]);
  const [userStatus, setUserStatus] = useState<UserPaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'plans' | 'packages'>('plans');
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<BillingPeriod>('MONTHLY');
  
  // Promo code states
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoApplied, setPromoApplied] = useState<PromoCodeApplied | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [plansData, packagesData, statusData] = await Promise.all([
          getSubscriptionPlans(),
          getAttemptPackages(),
          getUserPaymentStatus(),
        ]);
        setPlans(plansData);
        setPackages(packagesData);
        setUserStatus(statusData);
      } catch (error) {
        console.error('Error fetching pricing data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Filter plans by selected billing period
  const filteredPlans = useMemo(() => {
    return plans.filter(plan => plan.billing_period === selectedBillingPeriod);
  }, [plans, selectedBillingPeriod]);

  // Get monthly equivalent price for comparison
  const getMonthlyEquivalent = (plan: SubscriptionPlan): number => {
    switch (plan.billing_period) {
      case 'QUARTERLY':
        return Math.round(plan.price / 3);
      case 'BIANNUAL':
        return Math.round(plan.price / 6);
      case 'YEARLY':
        return Math.round(plan.price / 12);
      default:
        return plan.price;
    }
  };

  // Get savings compared to monthly
  const getSavings = (plan: SubscriptionPlan): number | null => {
    const monthlyPlan = plans.find(
      p => p.plan_type === plan.plan_type && p.billing_period === 'MONTHLY'
    );
    if (!monthlyPlan || plan.billing_period === 'MONTHLY') return null;

    const months = plan.billing_period === 'QUARTERLY' ? 3 : 
                   plan.billing_period === 'BIANNUAL' ? 6 : 12;
    const monthlyTotal = monthlyPlan.price * months;
    return monthlyTotal - plan.price;
  };

  const openPromoModal = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setPromoCode('');
    setPromoApplied(null);
    setPromoError(null);
    setShowPromoModal(true);
  };

  const closePromoModal = () => {
    setShowPromoModal(false);
    setSelectedPlan(null);
    setPromoCode('');
    setPromoApplied(null);
    setPromoError(null);
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim() || !selectedPlan) return;
    
    setPromoLoading(true);
    setPromoError(null);
    
    try {
      const result = await validatePromoCode(promoCode.trim(), selectedPlan.id);
      
      if (result.valid && result.code) {
        setPromoApplied({
          code: result.code,
          discount_type: result.discount_type!,
          discount_value: result.discount_value!,
          discount_amount: result.discount_amount!,
          original_amount: result.original_amount!,
          final_amount: result.final_amount!,
        });
        setPromoError(null);
      } else {
        setPromoError(result.message);
        setPromoApplied(null);
      }
    } catch (error) {
      console.error('Error validating promo code:', error);
      setPromoError('Failed to validate promo code. Please try again.');
      setPromoApplied(null);
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoApplied(null);
    setPromoCode('');
    setPromoError(null);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedPlan) return;
    
    try {
      setPurchasing(selectedPlan.id);
      const order = await createSubscriptionOrder(
        selectedPlan.id,
        promoApplied?.code
      );
      if (order.checkout_url) {
        closePromoModal();
        redirectToPayme(order.checkout_url);
      }
    } catch (error: unknown) {
      console.error('Error creating order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create order. Please try again.';
      alert(errorMessage);
    } finally {
      setPurchasing(null);
    }
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    openPromoModal(plan);
  };

  const handleBuyPackage = async (packageId: number) => {
    try {
      setPurchasing(packageId + 1000);
      const order = await createAttemptOrder(packageId);
      if (order.checkout_url) {
        redirectToPayme(order.checkout_url);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create order. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'PLUS':
        return <Zap className="w-7 h-7" />;
      case 'PRO':
        return <Crown className="w-7 h-7" />;
      case 'ULTRA':
        return <Sparkles className="w-7 h-7" />;
      default:
        return <Star className="w-7 h-7" />;
    }
  };

  const getPlanGradient = (planType: string, isPopular: boolean) => {
    if (isPopular) {
      return 'from-violet-600 via-purple-600 to-indigo-600';
    }
    switch (planType) {
      case 'PLUS':
        return 'from-sky-500 to-blue-600';
      case 'PRO':
        return 'from-purple-500 to-pink-500';
      case 'ULTRA':
        return 'from-amber-500 via-orange-500 to-red-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getPlanBorderColor = (planType: string, isPopular: boolean) => {
    if (isPopular) {
      return 'ring-2 ring-purple-500/50 dark:ring-purple-400/50';
    }
    return 'ring-1 ring-slate-200 dark:ring-slate-700';
  };

  const getBillingLabel = (period: BillingPeriod): string => {
    switch (period) {
      case 'MONTHLY': return 'month';
      case 'QUARTERLY': return '3 months';
      case 'BIANNUAL': return '6 months';
      case 'YEARLY': return 'year';
      default: return 'month';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-slate-200 dark:border-slate-700"></div>
            <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-purple-500 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-20 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 pt-16 pb-12">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-700 dark:text-purple-300 text-sm font-medium mb-6">
              <Flame className="w-4 h-4" />
              <span>Boost Your IELTS Score</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
              Choose Your
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"> Perfect Plan</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Unlock AI-powered feedback, unlimited practice tests, and expert insights to ace your IELTS exam
            </p>
          </div>

          {/* Current Status Badge */}
          {userStatus?.has_active_subscription && userStatus.subscription && (
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Active Subscription</p>
                  <p className="text-slate-900 dark:text-white font-semibold">
                    {userStatus.subscription.plan?.name} • {userStatus.subscription.days_remaining} days left
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-16">
        {/* Your Attempts Summary */}
        {userStatus && (
          <div className="mb-12 bg-white dark:bg-slate-900/50 rounded-3xl p-6 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200/50 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Your Current Balance</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="group relative bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800/30 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <PenTool className="w-5 h-5 text-blue-500 mb-2" />
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{userStatus.attempts.writing_attempts}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Writing</p>
              </div>
              <div className="group relative bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-2xl p-4 border border-purple-100 dark:border-purple-800/30 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
                <Mic className="w-5 h-5 text-purple-500 mb-2" />
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{userStatus.attempts.speaking_attempts}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Speaking</p>
              </div>
              <div className="group relative bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-800/30 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
                <BookOpen className="w-5 h-5 text-emerald-500 mb-2" />
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{userStatus.attempts.reading_attempts}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Reading</p>
              </div>
              <div className="group relative bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-4 border border-amber-100 dark:border-amber-800/30 hover:border-amber-300 dark:hover:border-amber-700 transition-colors">
                <Headphones className="w-5 h-5 text-amber-500 mb-2" />
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{userStatus.attempts.listening_attempts}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Listening</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Switch */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-1.5">
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-6 py-3 rounded-xl font-medium transition-all text-sm ${
                activeTab === 'plans'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Subscription Plans
            </button>
            <button
              onClick={() => setActiveTab('packages')}
              className={`px-6 py-3 rounded-xl font-medium transition-all text-sm ${
                activeTab === 'packages'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Attempt Packages
            </button>
          </div>
        </div>

        {/* Subscription Plans */}
        {activeTab === 'plans' && (
          <>
            {/* Billing Period Toggle */}
            <div className="flex justify-center mb-10">
              <div className="inline-flex items-center bg-white dark:bg-slate-800/50 rounded-2xl p-1.5 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200/50 dark:border-slate-700/50">
                {BILLING_PERIODS.map((period) => (
                  <button
                    key={period.value}
                    onClick={() => setSelectedBillingPeriod(period.value)}
                    className={`relative px-4 md:px-6 py-2.5 rounded-xl font-medium transition-all text-sm ${
                      selectedBillingPeriod === period.value
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="hidden md:inline">{period.label}</span>
                    <span className="md:hidden">{period.shortLabel}</span>
                    {period.discount && selectedBillingPeriod !== period.value && (
                      <span className="absolute -top-2 -right-1 px-1.5 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full">
                        -{period.discount}%
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Plans Grid */}
            {filteredPlans.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                {filteredPlans.map((plan) => {
                  const savings = getSavings(plan);
                  const monthlyEquivalent = getMonthlyEquivalent(plan);
                  
                  return (
                    <div
                      key={plan.id}
                      className={`relative group bg-white dark:bg-slate-900/50 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 ${getPlanBorderColor(plan.plan_type, plan.is_popular)}`}
                    >
                      {/* Popular Badge */}
                      {plan.is_popular && (
                        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold py-2 text-center tracking-wider">
                          ⭐ MOST POPULAR
                        </div>
                      )}

                      {/* Savings Badge */}
                      {savings && savings > 0 && (
                        <div className="absolute top-4 right-4 z-10">
                          <div className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full shadow-lg">
                            Save {savings.toLocaleString()} UZS
                          </div>
                        </div>
                      )}

                      {/* Card Content */}
                      <div className={`${plan.is_popular ? 'pt-12' : 'pt-8'} px-6 pb-8`}>
                        {/* Plan Header */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getPlanGradient(plan.plan_type, false)} flex items-center justify-center text-white shadow-lg`}>
                            {getPlanIcon(plan.plan_type)}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{plan.description}</p>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="mb-6">
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-slate-900 dark:text-white">
                              {plan.price.toLocaleString()}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 text-sm">
                              UZS / {getBillingLabel(plan.billing_period)}
                            </span>
                          </div>
                          {plan.billing_period !== 'MONTHLY' && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                              ~{monthlyEquivalent.toLocaleString()} UZS/month
                            </p>
                          )}
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent mb-6"></div>

                        {/* Attempts Grid */}
                        <div className="mb-6">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                            Included Attempts
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                plan.writing_unlimited 
                                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
                                  : 'bg-blue-100 dark:bg-blue-800/50 text-blue-600 dark:text-blue-400'
                              }`}>
                                {plan.writing_unlimited ? '∞' : plan.writing_attempts}
                              </div>
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Writing</span>
                            </div>
                            <div className="flex items-center gap-2 p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                plan.speaking_unlimited 
                                  ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white' 
                                  : 'bg-purple-100 dark:bg-purple-800/50 text-purple-600 dark:text-purple-400'
                              }`}>
                                {plan.speaking_unlimited ? '∞' : plan.speaking_attempts}
                              </div>
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Speaking</span>
                            </div>
                            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                plan.reading_unlimited 
                                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white' 
                                  : 'bg-emerald-100 dark:bg-emerald-800/50 text-emerald-600 dark:text-emerald-400'
                              }`}>
                                {plan.reading_unlimited ? '∞' : plan.reading_attempts}
                              </div>
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Reading</span>
                            </div>
                            <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                plan.listening_unlimited 
                                  ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white' 
                                  : 'bg-amber-100 dark:bg-amber-800/50 text-amber-600 dark:text-amber-400'
                              }`}>
                                {plan.listening_unlimited ? '∞' : plan.listening_attempts}
                              </div>
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Listening</span>
                            </div>
                          </div>
                        </div>

                        {/* Features */}
                        <div className="space-y-3 mb-6">
                          {plan.features.slice(0, 4).map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-2.5">
                              <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                              </div>
                              <span className="text-sm text-slate-600 dark:text-slate-400">{feature}</span>
                            </div>
                          ))}
                          {plan.book_access && (
                            <div className="flex items-start gap-2.5">
                              <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <BookMarked className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              </div>
                              <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Premium Books Access</span>
                            </div>
                          )}
                          {plan.cd_exam_attempts > 0 && (
                            <div className="flex items-start gap-2.5">
                              <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              </div>
                              <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                {plan.cd_exam_attempts} Free CD IELTS Exam{plan.cd_exam_attempts > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* CTA Button */}
                        <button
                          onClick={() => handleSubscribe(plan)}
                          disabled={purchasing === plan.id}
                          className={`w-full py-3.5 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                            plan.is_popular
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02]'
                              : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 hover:scale-[1.02]'
                          } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                        >
                          {purchasing === plan.id ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              Get Started
                              <ArrowRight className="w-5 h-5" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  No plans available for this period
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  Try selecting a different billing period above
                </p>
              </div>
            )}
          </>
        )}

        {/* Attempt Packages */}
        {activeTab === 'packages' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="group bg-white dark:bg-slate-900/50 rounded-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all hover:shadow-xl hover:-translate-y-1"
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      pkg.attempt_type === 'WRITING' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                      pkg.attempt_type === 'SPEAKING' ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
                      pkg.attempt_type === 'READING' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' :
                      pkg.attempt_type === 'LISTENING' ? 'bg-gradient-to-br from-amber-500 to-amber-600' :
                      'bg-gradient-to-br from-indigo-500 to-purple-600'
                    } text-white shadow-lg`}>
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">{pkg.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{pkg.attempt_type.toLowerCase()}</p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">{pkg.description}</p>

                  {pkg.attempt_type === 'MIXED' ? (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="font-bold text-blue-600">{pkg.writing_attempts}</p>
                        <p className="text-xs text-slate-500">Writing</p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="font-bold text-purple-600">{pkg.speaking_attempts}</p>
                        <p className="text-xs text-slate-500">Speaking</p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="font-bold text-emerald-600">{pkg.reading_attempts}</p>
                        <p className="text-xs text-slate-500">Reading</p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="font-bold text-amber-600">{pkg.listening_attempts}</p>
                        <p className="text-xs text-slate-500">Listening</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-xl mb-4">
                      <p className="text-4xl font-bold text-slate-900 dark:text-white">{pkg.attempts_count}</p>
                      <p className="text-sm text-slate-500">attempts</p>
                    </div>
                  )}

                  <div className="flex items-baseline justify-between mb-4">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">
                      {pkg.price.toLocaleString()}
                    </span>
                    <span className="text-slate-500">UZS</span>
                  </div>

                  <button
                    onClick={() => handleBuyPackage(pkg.id)}
                    disabled={purchasing === pkg.id + 1000}
                    className="w-full py-3 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-[1.02]"
                  >
                    {purchasing === pkg.id + 1000 ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Buy Now'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Everything you need to know about our plans
            </p>
          </div>
          <div className="max-w-3xl mx-auto grid gap-4">
            {[
              {
                q: "How do attempts work?",
                a: "Each time you use a premium feature (Writing check, Speaking practice, etc.), one attempt is deducted from your balance. Subscription plans include monthly attempts that reset each billing period."
              },
              {
                q: "Can I purchase additional attempts?",
                a: "Yes! You can purchase attempt packages anytime, even with an active subscription. These attempts are added to your balance and never expire."
              },
              {
                q: "What payment methods are accepted?",
                a: "We accept payments via Payme, supporting all major bank cards in Uzbekistan including Uzcard, Humo, Visa, and Mastercard."
              },
              {
                q: "Can I cancel my subscription?",
                a: "Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your current billing period."
              },
              {
                q: "What's the benefit of longer billing periods?",
                a: "Longer billing periods offer significant discounts - save up to 30% with yearly plans compared to monthly billing."
              }
            ].map((faq, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{faq.q}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Promo Code Modal */}
      {showPromoModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closePromoModal}
          />
          
          {/* Modal */}
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className={`bg-gradient-to-r ${getPlanGradient(selectedPlan.plan_type, selectedPlan.is_popular)} p-6 text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    {getPlanIcon(selectedPlan.plan_type)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedPlan.name}</h3>
                    <p className="text-white/80 text-sm">
                      {getBillingLabel(selectedPlan.billing_period)} subscription
                    </p>
                  </div>
                </div>
                <button 
                  onClick={closePromoModal}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Promo Code Input */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <Tag className="w-4 h-4" />
                  Have a promo code?
                </label>
                
                {promoApplied ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <span className="font-medium text-green-700 dark:text-green-400">{promoApplied.code}</span>
                      <span className="text-sm text-green-600 dark:text-green-500">
                        ({promoApplied.discount_type === 'PERCENTAGE' 
                          ? `${promoApplied.discount_value}% off` 
                          : `${promoApplied.discount_value.toLocaleString()} UZS off`})
                      </span>
                    </div>
                    <button
                      onClick={handleRemovePromo}
                      className="p-1 hover:bg-green-100 dark:hover:bg-green-800 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="Enter promo code"
                      className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleApplyPromo();
                        }
                      }}
                    />
                    <button
                      onClick={handleApplyPromo}
                      disabled={!promoCode.trim() || promoLoading}
                      className="px-5 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {promoLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Apply'
                      )}
                    </button>
                  </div>
                )}
                
                {promoError && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    {promoError}
                  </div>
                )}
              </div>

              {/* Price Summary */}
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Original Price</span>
                  <span className={`font-medium ${promoApplied ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                    {selectedPlan.price.toLocaleString()} UZS
                  </span>
                </div>
                
                {promoApplied && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600 dark:text-green-400">Discount</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        -{promoApplied.discount_amount.toLocaleString()} UZS
                      </span>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white">Final Price</span>
                      <span className="font-bold text-lg text-slate-900 dark:text-white">
                        {promoApplied.final_amount.toLocaleString()} UZS
                      </span>
                    </div>
                  </>
                )}
                
                {!promoApplied && (
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">Total</span>
                    <span className="font-bold text-lg text-slate-900 dark:text-white">
                      {selectedPlan.price.toLocaleString()} UZS
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={closePromoModal}
                  className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPurchase}
                  disabled={purchasing === selectedPlan.id}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 bg-gradient-to-r ${getPlanGradient(selectedPlan.plan_type, selectedPlan.is_popular)} text-white hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                >
                  {purchasing === selectedPlan.id ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Proceed to Payment
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
