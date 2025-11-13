'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';

export function CallToActionSection() {
  const { user, loading } = useAuth();

  return (
    <section className="py-24 bg-linear-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Ready to Achieve Your Dream Score?
          </h2>
          <p className="text-xl text-blue-50">
            Join thousands of students who have improved their IELTS scores with our platform.
          </p>
          {!loading && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-blue-600 font-semibold hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    Go to Dashboard
                  </Link>
                  <Link
                    href="/dashboard/cd-exam"
                    className="w-full sm:w-auto px-8 py-4 rounded-full border-2 border-white text-white font-semibold hover:bg-white/10 transition-all duration-200"
                  >
                    Start Practice Test
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-blue-600 font-semibold hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    Get Started Now
                  </Link>
                  <Link
                    href="/login"
                    className="w-full sm:w-auto px-8 py-4 rounded-full border-2 border-white text-white font-semibold hover:bg-white/10 transition-all duration-200"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
