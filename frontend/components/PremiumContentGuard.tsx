'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Zap, ArrowRight } from 'lucide-react';
import { checkAccess, useAttempt } from '@/lib/payments';
import type { AttemptType } from '@/types/payment';

interface PremiumContentGuardProps {
  type: AttemptType | 'BOOK';
  contentId?: number;
  children: ReactNode;
  /** 
   * If true, will automatically use an attempt when rendering children 
   * Set to false if you want to manually control attempt usage
   */
  autoUseAttempt?: boolean;
  /** Called after an attempt is successfully used */
  onAttemptUsed?: () => void;
  /** Fallback content to show when checking access */
  loadingContent?: ReactNode;
  /** Custom locked content */
  lockedContent?: ReactNode;
}

export function PremiumContentGuard({
  type,
  contentId,
  children,
  autoUseAttempt = true,
  onAttemptUsed,
  loadingContent,
  lockedContent,
}: PremiumContentGuardProps) {
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [using, setUsing] = useState(false);
  const [attemptUsed, setAttemptUsed] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const response = await checkAccess(type, contentId);
        setHasAccess(response.has_access);
        setAttemptsRemaining(response.attempts_remaining || 0);
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    }
    check();
  }, [type, contentId]);

  const handleUseAttempt = async () => {
    if (type === 'BOOK') return; // Books don't use attempts
    
    setUsing(true);
    try {
      const response = await useAttempt(type as AttemptType, undefined, contentId);
      if (response.success) {
        setAttemptUsed(true);
        setAttemptsRemaining(response.attempts_remaining);
        onAttemptUsed?.();
      }
    } catch (error) {
      console.error('Error using attempt:', error);
      setHasAccess(false);
    } finally {
      setUsing(false);
    }
  };

  // Auto-use attempt when access is granted
  useEffect(() => {
    if (hasAccess && autoUseAttempt && !attemptUsed && type !== 'BOOK') {
      handleUseAttempt();
    }
  }, [hasAccess, autoUseAttempt, attemptUsed, type]);

  if (loading) {
    return loadingContent || (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hasAccess || (autoUseAttempt && !attemptUsed && type !== 'BOOK')) {
    if (using) {
      return loadingContent || (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    return lockedContent || (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            Premium Content
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {type === 'BOOK' 
              ? 'This book requires a subscription with premium book access.'
              : `You need ${type.toLowerCase()} attempts to access this content.`}
          </p>
          
          {attemptsRemaining > 0 && type !== 'BOOK' && (
            <div className="mb-6">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                You have <span className="font-bold text-blue-600">{attemptsRemaining}</span> {type.toLowerCase()} attempts remaining
              </p>
              <button
                onClick={handleUseAttempt}
                disabled={using}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2 mx-auto disabled:opacity-50"
              >
                {using ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Using attempt...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Use 1 Attempt
                  </>
                )}
              </button>
            </div>
          )}

          <button
            onClick={() => router.push('/dashboard/pricing')}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
          >
            Get Premium Access
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook for manually checking and using attempts
 */
export function usePremiumAccess(type: AttemptType | 'BOOK', contentId?: number) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      try {
        const response = await checkAccess(type, contentId);
        setHasAccess(response.has_access);
        setAttemptsRemaining(response.attempts_remaining || 0);
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    }
    check();
  }, [type, contentId]);

  const consumeAttempt = async () => {
    if (type === 'BOOK' || !hasAccess) return false;
    
    try {
      const response = await useAttempt(type as AttemptType, undefined, contentId);
      setAttemptsRemaining(response.attempts_remaining);
      return response.success;
    } catch (error) {
      console.error('Error using attempt:', error);
      return false;
    }
  };

  return {
    hasAccess,
    attemptsRemaining,
    loading,
    consumeAttempt,
    refresh: async () => {
      const response = await checkAccess(type, contentId);
      setHasAccess(response.has_access);
      setAttemptsRemaining(response.attempts_remaining || 0);
    },
  };
}
