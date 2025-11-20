'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/components/AuthProvider';

export default function TelegramVerifyPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [botInfo, setBotInfo] = useState<{ bot_username: string; bot_url: string } | null>(null);

  useEffect(() => {
    // Fetch bot info
    const fetchBotInfo = async () => {
      try {
        const response = await apiClient.get('/accounts/api/telegram/bot-info/');
        setBotInfo(response.data as { bot_username: string; bot_url: string });
      } catch (err) {
        console.error('Error fetching bot info:', err);
      }
    };

    fetchBotInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/accounts/api/telegram/verify/', {
        code: code
      });

      const data = response.data as { access: string; refresh: string; user: any };

      // Store tokens
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Refresh user state in AuthProvider
      await refreshUser();
      
      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const openTelegramBot = () => {
    if (botInfo) {
      window.open(botInfo.bot_url, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-950 flex items-center justify-center p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border border-slate-200 dark:border-slate-800">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-blue-500 to-indigo-500 rounded-2xl mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Telegram Verification
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Enter the code from Telegram bot
            </p>
          </div>

          {/* Instructions */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
              How to get your code:
            </h3>
            <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <span>Open the BandBooster bot in Telegram</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span>Send /start command</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span>Share your contact information</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">4.</span>
                <span>Copy the 6-digit code and paste it below</span>
              </li>
            </ol>
          </div>

          {/* Open Bot Button */}
          {botInfo && (
            <button
              onClick={openTelegramBot}
              className="w-full mb-6 px-6 py-3 bg-linear-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
              Open Telegram Bot
            </button>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Code Input */}
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                id="code"
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                placeholder="000000"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
                Enter the 6-digit code from Telegram
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full px-6 py-3 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Verify & Continue'
              )}
            </button>
          </form>

          {/* Back Link */}
          <div className="mt-6 text-center">
            <Link
              href="/register"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Back to registration
            </Link>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-6">
          Code expires in 10 minutes. Make sure to enter it quickly!
        </p>
      </div>
    </div>
  );
}
