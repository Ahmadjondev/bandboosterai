'use client';

import Link from 'next/link';
import { FileText, AlertCircle, CheckCircle, XCircle, Scale } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link 
            href="/" 
            className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Title Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-4">
            <FileText className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Terms of Service
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Last updated: November 10, 2025
          </p>
        </div>

        {/* Introduction */}
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-6 mb-8">
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-0">
              Welcome to BandBooster! These Terms of Service ("Terms") govern your access to and use of 
              our IELTS mock testing platform. By using our services, you agree to these Terms. Please read 
              them carefully.
            </p>
          </div>

          {/* Section 1 */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-0">
                Acceptance of Terms
              </h2>
            </div>
            
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              By creating an account or using BandBooster, you acknowledge that you have read, understood, 
              and agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, 
              you may not use our services.
            </p>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Age Requirement:</strong> You must be at least 13 years old to use BandBooster. 
                Users under 18 should have parental consent.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Account Registration
            </h2>
            
            <div className="space-y-4">
              <p className="text-slate-700 dark:text-slate-300">
                To access certain features, you must create an account. When creating an account, you agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300 ml-4">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and update your information to keep it accurate</li>
                <li>Keep your password secure and confidential</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use</li>
              </ul>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mt-4">
                <p className="text-sm text-red-800 dark:text-red-200">
                  <strong>Warning:</strong> You are responsible for maintaining the confidentiality of your 
                  account credentials. We are not liable for any loss or damage from your failure to protect 
                  your account.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Scale className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-0">
                User Responsibilities
              </h2>
            </div>
            
            <div className="space-y-4">
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                <strong>You agree NOT to:</strong>
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300 ml-4">
                <li>Use the platform for any illegal or unauthorized purpose</li>
                <li>Share your account credentials with others</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Copy, distribute, or reproduce content without permission</li>
                <li>Use automated scripts or bots to access the platform</li>
                <li>Interfere with or disrupt the platform's operation</li>
                <li>Upload malicious code or viruses</li>
                <li>Impersonate another user or person</li>
                <li>Harass, abuse, or harm other users</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Platform Services
            </h2>
            
            <div className="space-y-4">
              <p className="text-slate-700 dark:text-slate-300">
                BandBooster provides:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300 ml-4">
                <li>IELTS mock test simulations (Reading, Listening, Writing, Speaking)</li>
                <li>Practice questions and exercises</li>
                <li>Progress tracking and performance analytics</li>
                <li>Score calculations and feedback</li>
                <li>Study materials and resources</li>
              </ul>
              
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 font-semibold mb-2">
                      Important Disclaimer:
                    </p>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      BandBooster is a practice platform and is not affiliated with the official IELTS 
                      examination. Our scores are estimates and may not reflect your actual IELTS performance. 
                      We do not guarantee any specific test results.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Intellectual Property
            </h2>
            
            <div className="space-y-4">
              <p className="text-slate-700 dark:text-slate-300">
                All content on BandBooster, including but not limited to text, graphics, logos, images, 
                questions, audio files, and software, is the property of BandBooster or its content suppliers 
                and is protected by copyright and intellectual property laws.
              </p>
              
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                  What you CAN do:
                </h3>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300 ml-4">
                  <li>Use the platform for personal, non-commercial preparation</li>
                  <li>View and practice with provided materials</li>
                  <li>Download your own test results and progress reports</li>
                </ul>
                
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 mt-6">
                  What you CANNOT do:
                </h3>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300 ml-4">
                  <li>Copy, reproduce, or distribute our content</li>
                  <li>Use content for commercial purposes</li>
                  <li>Modify or create derivative works</li>
                  <li>Remove copyright or proprietary notices</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Payment and Subscriptions
            </h2>
            
            <p className="text-slate-700 dark:text-slate-300 mb-3">
              BandBooster offers both free and paid services:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300 ml-4">
              <li><strong>Free Account:</strong> Access to basic practice questions and limited tests</li>
              <li><strong>Premium Features:</strong> May require payment for advanced content and features</li>
              <li><strong>Refunds:</strong> All sales are final unless required by law</li>
              <li><strong>Price Changes:</strong> We reserve the right to modify pricing with notice</li>
              <li><strong>Cancellation:</strong> You may cancel your account at any time</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-0">
                Termination
              </h2>
            </div>
            
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              We reserve the right to suspend or terminate your account at any time for:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300 ml-4">
              <li>Violation of these Terms</li>
              <li>Fraudulent or illegal activity</li>
              <li>Abuse of the platform or other users</li>
              <li>Extended periods of inactivity</li>
            </ul>
            <p className="text-slate-700 dark:text-slate-300 mt-4">
              Upon termination, your right to use the platform will immediately cease. We may retain certain 
              information as required by law or for legitimate business purposes.
            </p>
          </section>

          {/* Section 8 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Disclaimer of Warranties
            </h2>
            
            <div className="p-6 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg">
              <p className="text-slate-700 dark:text-slate-300 font-semibold mb-3">
                THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND.
              </p>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                We do not warrant that:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300 ml-4">
                <li>The platform will be uninterrupted or error-free</li>
                <li>Defects will be corrected</li>
                <li>The platform is free of viruses or harmful components</li>
                <li>Results will be accurate or reliable</li>
                <li>Your use will meet your requirements</li>
              </ul>
            </div>
          </section>

          {/* Section 9 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Limitation of Liability
            </h2>
            
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, BANDBOOSTER SHALL NOT BE LIABLE FOR:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300 ml-4">
              <li>Indirect, incidental, special, or consequential damages</li>
              <li>Loss of profits, data, or goodwill</li>
              <li>Service interruptions or data loss</li>
              <li>Errors or inaccuracies in content</li>
              <li>Unauthorized access to your account</li>
            </ul>
          </section>

          {/* Section 10 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Changes to Terms
            </h2>
            
            <p className="text-slate-700 dark:text-slate-300">
              We may modify these Terms at any time. We will notify you of material changes via email or 
              platform notification. Continued use of the platform after changes constitutes acceptance of 
              the new Terms. We encourage you to review these Terms periodically.
            </p>
          </section>

          {/* Section 11 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Governing Law
            </h2>
            
            <p className="text-slate-700 dark:text-slate-300">
              These Terms shall be governed by and construed in accordance with applicable laws, without 
              regard to conflict of law principles. Any disputes arising from these Terms shall be resolved 
              through binding arbitration or in the courts of competent jurisdiction.
            </p>
          </section>

          {/* Contact Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Contact Information
            </h2>
            
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              If you have questions about these Terms, please contact us:
            </p>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a 
                    href="mailto:bandboosterai@gmail.com" 
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                  >
                    bandboosterai@gmail.com
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                  </svg>
                  <a 
                    href="https://t.me/Ahmadjon_dev" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                  >
                    @Ahmadjon_dev
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
          <div className="text-center">
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              By using BandBooster, you agree to these Terms of Service
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
              >
                Create Account
              </Link>
              <Link
                href="/privacy"
                className="inline-flex items-center justify-center px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg transition-colors"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
