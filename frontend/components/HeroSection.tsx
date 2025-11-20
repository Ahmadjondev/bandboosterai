'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from './AuthProvider';
import { LandingNavbar } from './LandingNavbar';

export function HeroSection() {
  const { user, loading } = useAuth();

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-950">
      {/* Navigation Bar */}
      <LandingNavbar />

      {/* Hero Content */}
      <div className="relative flex-1 flex items-center justify-center">
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Floating elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-2 h-2 bg-blue-400 rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-3 h-3 bg-purple-400 rounded-full opacity-40 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-indigo-400 rounded-full opacity-50 animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center space-y-12">
          {/* Premium Badge */}
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-blue-200 dark:border-slate-700 shadow-lg">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
            </span>
            <span className="text-sm font-semibold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Premium IELTS Preparation Platform
            </span>
          </div>

          {/* Main Heading with improved typography */}
          <div className="space-y-1">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight leading-tight">
              <span className="block text-slate-900 dark:text-white mb-4">
                Own Your
              </span>
              <span className="block bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                IELTS Success
              </span>
            </h1>

          {/* Subtitle with improved design */}
          <p className="max-w-3xl mx-auto text-xl md:text-2xl text-slate-600 dark:text-slate-300 font-light leading-relaxed">
            Professional IELTS preparation with authentic mock tests, instant AI-powered feedback, and certified expert evaluation.
          </p>
        </div>

          {/* Enhanced CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!loading && (
              <>
                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="group w-full sm:w-auto px-10 py-5 rounded-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg font-semibold transition-all duration-300 shadow-2xl hover:shadow-blue-500/50 hover:scale-105 flex items-center justify-center gap-2"
                    >
                      Go to Dashboard
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                    <Link
                      href="/dashboard/cd-exam"
                      className="w-full sm:w-auto px-10 py-5 rounded-full border-2 border-slate-300 dark:border-slate-600 hover:border-blue-600 dark:hover:border-blue-400 text-slate-700 dark:text-slate-300 text-lg font-semibold transition-all duration-300 hover:bg-white dark:hover:bg-slate-800 shadow-lg"
                    >
                      Take Practice Test
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/register"
                      className="group w-full sm:w-auto px-10 py-5 rounded-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg font-semibold transition-all duration-300 shadow-2xl hover:shadow-blue-500/50 hover:scale-105 flex items-center justify-center gap-2"
                    >
                      Get Started Free
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                    <Link
                      href="/login"
                      className="w-full sm:w-auto px-10 py-5 rounded-full border-2 border-slate-300 dark:border-slate-600 hover:border-blue-600 dark:hover:border-blue-400 text-slate-700 dark:text-slate-300 text-lg font-semibold transition-all duration-300 hover:bg-white dark:hover:bg-slate-800 shadow-lg"
                    >
                      Sign In
                    </Link>
                  </>
                )}
              </>
            )}
          </div>

          {/* Trust indicators with icons */}
          <div className=" grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="space-y-3 p-6 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200 dark:border-slate-700">
              <div className="text-4xl">📚</div>
              <div className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">500+</div>
              <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Practice Questions</div>
            </div>
            <div className="space-y-3 p-6 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200 dark:border-slate-700">
              <div className="text-4xl">🎯</div>
              <div className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">50+</div>
              <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Authentic Mock Tests</div>
            </div>
            <div className="space-y-3 p-6 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200 dark:border-slate-700">
              <div className="text-4xl">⭐</div>
              <div className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">95%</div>
              <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Success Rate</div>
            </div>
            <div className="space-y-3 p-6 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200 dark:border-slate-700">
              <div className="text-4xl">👥</div>
              <div className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">1K+</div>
              <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Active Students</div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
