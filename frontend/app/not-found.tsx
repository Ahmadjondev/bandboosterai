'use client';

import Link from 'next/link';
import { Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-indigo-600 dark:text-indigo-400 mb-4">
            404
          </h1>
          <div className="flex items-center justify-center gap-2 mb-6">
            <Search className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            <p className="text-3xl font-semibold text-slate-800 dark:text-slate-200">
              Page Not Found
            </p>
          </div>
        </div>

        {/* Message */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 mb-8">
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
            The page you're looking for doesn't exist. It might have been moved, deleted, 
            or you may have mistyped the URL.
          </p>

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

        {/* Quick Links */}
        <div className="text-slate-600 dark:text-slate-400">
          <p className="mb-3">Looking for something? Try these:</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/books"
              className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              Practice Books
            </Link>
            <Link
              href="/dashboard/cd-exam"
              className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              Mock Tests
            </Link>
            <Link
              href="/dashboard/books"
              className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              Books
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
