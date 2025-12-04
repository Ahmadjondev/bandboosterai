'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import { getOrderStatus } from '@/lib/payments';
import type { PaymentOrder } from '@/types/payment';

export default function PaymentStatusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');

  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) {
        setError('No order ID provided');
        setLoading(false);
        return;
      }

      try {
        const orderData = await getOrderStatus(orderId);
        setOrder(orderData);
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('Failed to load order status');
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();

    // Poll for status updates if pending
    const interval = setInterval(() => {
      if (order?.status === 'PENDING') {
        fetchOrder();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [orderId, order?.status]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Checking payment status...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
        <div className="text-center max-w-md">
          <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{error || 'Unable to find your order'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const StatusIcon = () => {
    switch (order.status) {
      case 'PAID':
        return <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />;
      case 'CANCELLED':
      case 'EXPIRED':
        return <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />;
      default:
        return <Clock className="w-20 h-20 text-amber-500 mx-auto mb-4 animate-pulse" />;
    }
  };

  const StatusMessage = () => {
    switch (order.status) {
      case 'PAID':
        return {
          title: 'Payment Successful! 🎉',
          description: 'Your payment has been processed successfully. Your account has been updated.',
        };
      case 'CANCELLED':
        return {
          title: 'Payment Cancelled',
          description: 'Your payment was cancelled. No charges were made.',
        };
      case 'EXPIRED':
        return {
          title: 'Order Expired',
          description: 'This order has expired. Please create a new order.',
        };
      default:
        return {
          title: 'Payment Pending',
          description: 'Your payment is being processed. This page will update automatically.',
        };
    }
  };

  const message = StatusMessage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
          <StatusIcon />
          
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {message.title}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {message.description}
          </p>

          {/* Order Details */}
          <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 mb-6 text-left">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Order Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-300">Order ID</span>
                <span className="text-slate-900 dark:text-white font-mono text-sm">
                  {order.order_id.slice(0, 8)}...
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-300">Type</span>
                <span className="text-slate-900 dark:text-white">
                  {order.order_type === 'SUBSCRIPTION' ? 'Subscription' : 'Attempt Package'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-300">Amount</span>
                <span className="text-slate-900 dark:text-white font-semibold">
                  {order.amount_formatted}
                </span>
              </div>
              {order.subscription_plan && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Plan</span>
                  <span className="text-slate-900 dark:text-white">
                    {order.subscription_plan.name}
                  </span>
                </div>
              )}
              {order.attempt_package && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Package</span>
                  <span className="text-slate-900 dark:text-white">
                    {order.attempt_package.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {order.status === 'PAID' && (
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                Go to Dashboard
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
            
            {order.status === 'PENDING' && (
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Refresh Status
              </button>
            )}

            {(order.status === 'CANCELLED' || order.status === 'EXPIRED') && (
              <button
                onClick={() => router.push('/dashboard/pricing')}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            )}

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
