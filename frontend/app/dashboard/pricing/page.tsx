'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Zap, Crown, Star, Sparkles, ArrowRight, Package } from 'lucide-react';
import {
  getSubscriptionPlans,
  getAttemptPackages,
  getUserPaymentStatus,
  createSubscriptionOrder,
  createAttemptOrder,
  redirectToPayme,
} from '@/lib/payments';
import type { SubscriptionPlan, AttemptPackage, UserPaymentStatus } from '@/types/payment';

export default function PricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [packages, setPackages] = useState<AttemptPackage[]>([]);
  const [userStatus, setUserStatus] = useState<UserPaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'plans' | 'packages'>('plans');

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

  const handleSubscribe = async (planId: number) => {
    try {
      setPurchasing(planId);
      const order = await createSubscriptionOrder(planId);
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

  const handleBuyPackage = async (packageId: number) => {
    try {
      setPurchasing(packageId + 1000); // Offset to differentiate from plans
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
        return <Zap className="w-8 h-8" />;
      case 'PRO':
        return <Crown className="w-8 h-8" />;
      case 'ULTRA':
        return <Sparkles className="w-8 h-8" />;
      default:
        return <Star className="w-8 h-8" />;
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'PLUS':
        return 'from-blue-500 to-cyan-500';
      case 'PRO':
        return 'from-purple-500 to-pink-500';
      case 'ULTRA':
        return 'from-amber-500 to-orange-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Unlock premium features and accelerate your IELTS preparation with our flexible plans
          </p>

          {/* Current Status */}
          {userStatus?.has_active_subscription && userStatus.subscription && (
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
              <Check className="w-5 h-5" />
              <span>Active {userStatus.subscription.plan?.name} subscription - {userStatus.subscription.days_remaining} days remaining</span>
            </div>
          )}
        </div>

        {/* Attempts Summary */}
        {userStatus && (
          <div className="mb-8 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Your Current Attempts</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{userStatus.attempts.writing_attempts}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Writing</p>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{userStatus.attempts.speaking_attempts}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Speaking</p>
              </div>
              <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{userStatus.attempts.reading_attempts}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Reading</p>
              </div>
              <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{userStatus.attempts.listening_attempts}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Listening</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Switch */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white dark:bg-slate-800 rounded-xl p-1 shadow-lg">
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'plans'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Monthly Plans
            </button>
            <button
              onClick={() => setActiveTab('packages')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'packages'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Attempt Packages
            </button>
          </div>
        </div>

        {/* Subscription Plans */}
        {activeTab === 'plans' && (
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden transform transition-all hover:scale-105 ${
                  plan.is_popular ? 'ring-2 ring-purple-500 dark:ring-purple-400' : ''
                }`}
              >
                {/* Popular Badge */}
                {plan.is_popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                    MOST POPULAR
                  </div>
                )}

                {/* Plan Header */}
                <div className={`bg-gradient-to-r ${getPlanColor(plan.plan_type)} p-6 text-white`}>
                  <div className="flex items-center gap-3 mb-4">
                    {getPlanIcon(plan.plan_type)}
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                  </div>
                  <p className="text-white/80 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price.toLocaleString()}</span>
                    <span className="text-white/80">UZS/{plan.billing_period === 'MONTHLY' ? 'month' : 'year'}</span>
                  </div>
                </div>

                {/* Attempts Included */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Monthly Attempts</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 font-bold text-sm">
                        {plan.writing_unlimited ? '∞' : plan.writing_attempts}
                      </span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">Writing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 font-bold text-sm">
                        {plan.speaking_unlimited ? '∞' : plan.speaking_attempts}
                      </span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">Speaking</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm ${
                        plan.reading_unlimited 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {plan.reading_unlimited ? '∞' : plan.reading_attempts}
                      </span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Reading {plan.reading_unlimited && <span className="text-emerald-500 font-medium">(Unlimited)</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm ${
                        plan.listening_unlimited 
                          ? 'bg-amber-500 text-white' 
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                      }`}>
                        {plan.listening_unlimited ? '∞' : plan.listening_attempts}
                      </span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Listening {plan.listening_unlimited && <span className="text-amber-500 font-medium">(Unlimited)</span>}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="p-6">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Features</h4>
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">{feature}</span>
                      </li>
                    ))}
                    {plan.book_access && (
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Premium Books Access</span>
                      </li>
                    )}
                  </ul>
                </div>

                {/* CTA */}
                <div className="p-6 pt-0">
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={purchasing === plan.id}
                    className={`w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                      plan.is_popular
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg'
                        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {purchasing === plan.id ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        Subscribe Now
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Attempt Packages */}
        {activeTab === 'packages' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      pkg.attempt_type === 'WRITING' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                      pkg.attempt_type === 'SPEAKING' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' :
                      pkg.attempt_type === 'READING' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                      pkg.attempt_type === 'LISTENING' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                      'bg-gradient-to-br from-blue-500 to-purple-500 text-white'
                    }`}>
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">{pkg.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{pkg.attempt_type.toLowerCase()}</p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{pkg.description}</p>

                  {pkg.attempt_type === 'MIXED' ? (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="text-center p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <p className="font-bold text-blue-600">{pkg.writing_attempts}</p>
                        <p className="text-xs text-slate-500">Writing</p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <p className="font-bold text-purple-600">{pkg.speaking_attempts}</p>
                        <p className="text-xs text-slate-500">Speaking</p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <p className="font-bold text-emerald-600">{pkg.reading_attempts}</p>
                        <p className="text-xs text-slate-500">Reading</p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <p className="font-bold text-amber-600">{pkg.listening_attempts}</p>
                        <p className="text-xs text-slate-500">Listening</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg mb-4">
                      <p className="text-3xl font-bold text-slate-900 dark:text-white">{pkg.attempts_count}</p>
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
                    className="w-full py-2.5 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {purchasing === pkg.id + 1000 ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white dark:border-slate-900"></div>
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
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">How do attempts work?</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Each time you use a premium feature (Writing check, Speaking practice, etc.), one attempt is deducted from your balance. 
                Subscription plans include monthly attempts that reset each billing period.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Can I purchase additional attempts?</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Yes! You can purchase attempt packages anytime, even with an active subscription. 
                These attempts are added to your balance and never expire.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">What payment methods are accepted?</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                We accept payments via Payme, supporting all major bank cards in Uzbekistan including Uzcard, Humo, Visa, and Mastercard.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Can I cancel my subscription?</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your current billing period.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
