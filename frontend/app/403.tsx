'use client';

import Link from 'next/link';
import { Home, ShieldAlert, ArrowLeft } from 'lucide-react';

export default function Forbidden() {
  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* 403 Illustration */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full mb-6">
            <ShieldAlert className="w-12 h-12 text-orange-600 dark:text-orange-400" />
          </div>
          <h1 className="text-6xl font-bold text-orange-600 dark:text-orange-400 mb-4">
            403
          </h1>
          <p className="text-3xl font-semibold text-slate-800 dark:text-slate-200">
            Access Denied
          </p>
        </div>

        {/* Message */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 mb-8">
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
            You don't have permission to access this page. This could be because:
          </p>
          
          <ul className="text-left space-y-2 text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-1">•</span>
              <span>Your account doesn't have the required permissions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-1">•</span>
              <span>You need to log in with a different account</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-1">•</span>
              <span>This page is restricted to certain user roles</span>
            </li>
          </ul>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
            >
              <Home className="w-5 h-5" />
              Go to Home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </button>
          </div>
        </div>

        {/* Help Text */}
        <div className="text-slate-600 dark:text-slate-400">
          <p className="text-sm">
            Need help? Contact us at{' '}
            <a 
              href="mailto:bandboosterai@gmail.com"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              bandboosterai@gmail.com
            </a>
            {' '}or{' '}
            <a
              href="https://t.me/Ahmadjon_dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Telegram
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
