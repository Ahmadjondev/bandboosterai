'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendVerificationCode } from '@/lib/auth';
import { useAuth } from '@/components/AuthProvider';
import { Mail, X, RefreshCw } from 'lucide-react';

interface EmailVerificationBannerProps {
  email: string;
  onDismiss?: () => void;
}

export default function EmailVerificationBanner({ email, onDismiss }: EmailVerificationBannerProps) {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  const handleVerifyNow = () => {
    router.push('/verify-email');
  };

  const handleSendVerification = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await sendVerificationCode();
      setMessage({
        type: 'success',
        text: response.message || 'Verification code sent successfully! Redirecting...',
      });
      
      // Refresh user state to update email verification status
      await refreshUser();
      
      // Redirect to verification page after 1 second
      setTimeout(() => {
        router.push('/verify-email');
      }, 1000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send verification code. Please try again.';
      setMessage({
        type: 'error',
        text: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isDismissed) return null;

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start flex-1">
          <div className="shrink-0">
            <Mail className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Email Verification Required
            </h3>
            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
              <p>
                Your email <span className="font-semibold">{email}</span> has not been verified yet.
                Please verify your email to access all features.
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleVerifyNow}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
              >
                Verify Now
              </button>
              <button
                onClick={handleSendVerification}
                disabled={isLoading}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-yellow-700 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900/40 hover:bg-yellow-200 dark:hover:bg-yellow-900/60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="animate-spin -ml-0.5 mr-2 h-3 w-3" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="-ml-0.5 mr-2 h-3 w-3" />
                    Resend Code
                  </>
                )}
              </button>
            </div>
            {message && (
              <div
                className={`mt-3 text-xs ${
                  message.type === 'success' 
                    ? 'text-green-700 dark:text-green-300' 
                    : 'text-red-700 dark:text-red-300'
                }`}
              >
                {message.text}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="ml-4 shrink-0 text-yellow-600 dark:text-yellow-500 hover:text-yellow-800 dark:hover:text-yellow-400 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
