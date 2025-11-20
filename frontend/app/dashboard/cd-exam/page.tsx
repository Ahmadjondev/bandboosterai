"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { getAvailableTests, createFullTestAttempt, checkActiveAttempt } from "@/lib/exam-api";
import { EmailNotVerifiedError } from '@/lib/api-client';
import { purchaseCDExam, getCurrentUser } from "@/lib/auth";
import { useAuth } from '@/components/AuthProvider';
import { PaymentDialog } from "@/components/PaymentDialog";

export default function CDExamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullTestExam, setFullTestExam] = useState<any | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<any | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [processingPayment, setProcessingPayment] = useState(false);
  const { refreshUser } = useAuth();

  // Load full test exam and check for active attempts on mount
  useEffect(() => {
    loadFullTestExam();
    checkForActiveAttempt();
    loadUserBalance();
  }, []);

  async function loadUserBalance() {
    const user = getCurrentUser();
    if (user && user.balance !== undefined) {
      setUserBalance(user.balance);
    }
  }

  async function checkForActiveAttempt() {
    try {
      const result = await checkActiveAttempt();
      if (result.has_active_attempt && result.active_attempt) {
        setActiveAttempt(result.active_attempt);
      }
    } catch (err: any) {
      // If user's email is not verified, redirect to verification flow.
      if (err instanceof EmailNotVerifiedError) {
        // Redirect unverified user to verification page
        router.push('/verify-email');
        return;
      }
      console.error("Failed to check active attempt:", err);
    }
  }

  async function loadFullTestExam() {
    try {
      // Request a random FULL_TEST or LISTENING_READING_WRITING exam
      const tests = await getAvailableTests({ 
        random: true, 
        examType: "FULL_TEST" 
      });
      
        if (tests && (Array.isArray(tests) ? tests.length > 0 : true)) {
          // API may return a single object or an array. Normalize to a single test.
          const selected = Array.isArray(tests) ? tests[0] : tests;
          setFullTestExam(selected);
          console.log("Selected random test:", selected.title);
        } else {
            // If FULL_TEST not available, try a shorter full (Listening+Reading+Writing)
            const alternativeTests = await getAvailableTests({ random: true, examType: 'LISTENING_READING_WRITING' });
            if (alternativeTests && (Array.isArray(alternativeTests) ? alternativeTests.length > 0 : true)) {
              const selectedAlt = Array.isArray(alternativeTests) ? alternativeTests[0] : alternativeTests;
              setFullTestExam(selectedAlt);
              console.log('Selected alternative test:', selectedAlt.title);
            } else {
              setError("No Full IELTS Test available at this time. Please contact your administrator.");
            }
        }
    } catch (err: any) {
      if (err instanceof EmailNotVerifiedError) {
        router.push('/verify-email');
        return;
      }
      console.error("Failed to load full test:", err);
      setError("Failed to load exam information. Please try again later.");
    }
  }

  async function handleStartTest() {
    if (!fullTestExam) {
      setError("No exam selected");
      return;
    }

    // Double-check for active attempts before starting
    if (activeAttempt) {
      setError("You have an active exam in progress. Please complete it first.");
      return;
    }

    // Show payment dialog
    setShowPaymentDialog(true);
  }

  async function handlePaymentConfirm() {
    setProcessingPayment(true);
    setError(null);

    try {
      // Process payment
      const { new_balance } = await purchaseCDExam();
      
      // Update local balance
      setUserBalance(new_balance);

      // Refresh global user context so Navbar and other components reflect the new balance
      try {
        await refreshUser();
      } catch (e) {
        // Non-fatal: log and continue
        console.error('Failed to refresh user after purchase:', e);
      }
      
      // Close payment dialog
      setShowPaymentDialog(false);
      
      // Start the exam
      await startExam();
    } catch (err: any) {
      console.error("Payment failed:", err);
      
      // Check if error is due to insufficient balance
      if (err.response?.status === 400) {
        setError(err.response.data.error || "Insufficient balance. Please top up your account.");
      } else {
        setError(err.message || "Payment failed. Please try again.");
      }
      
      setShowPaymentDialog(false);
    } finally {
      setProcessingPayment(false);
    }
  }

  async function startExam() {
    if (!fullTestExam) return;

    setLoading(true);
    setError(null);

    try {
      // Create exam attempt
      const { attemptId, attemptUuid } = await createFullTestAttempt(fullTestExam.id);
      
      // Strictly require UUID - if not present, show error
      if (!attemptUuid) {
        throw new Error("Exam attempt created but UUID is missing. Please contact support.");
      }
      
      // Redirect to exam page using UUID only
      router.push(`/exam/${attemptUuid}`);
    } catch (err: any) {
      if (err instanceof EmailNotVerifiedError) {
        router.push('/verify-email');
        return;
      }
      console.error("Failed to start test:", err);
      
      // Check if error response contains active attempt info
      if (err.response?.data?.active_attempt) {
        setActiveAttempt(err.response.data.active_attempt);
        setError(err.response.data.error || "You have an active exam in progress.");
      } else {
        setError(err.message || "Failed to start test. Please try again.");
      }
      setLoading(false);
    }
  }

  function handleResumeTest() {
    if (activeAttempt) {
      router.push(`/exam/${activeAttempt.attempt_uuid}`);
    }
  }

  return (
    <div>
        {/* Payment Dialog */}
        <PaymentDialog
          show={showPaymentDialog}
          onClose={() => setShowPaymentDialog(false)}
          onConfirm={handlePaymentConfirm}
          userBalance={userBalance}
          examPrice={50000}
          loading={processingPayment}
        />

        <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
            {/* Left Column - Main Info (3 cols on large screens) */}
            <div className="lg:col-span-3 flex flex-col justify-between space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
                    <span className="text-4xl sm:text-5xl">📝</span>
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-1">
                      CD IELTS Exam
                    </h1>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                      Computer-Delivered Full Practice Test
                    </p>
                  </div>
                </div>

                <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg leading-relaxed mb-8">
                  Experience a complete IELTS exam simulation with all four sections: Listening, Reading, Writing, and Speaking. Test yourself under real exam conditions.
                </p>

                {/* Test Details Grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-5 border border-blue-100 dark:border-blue-900/30">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
                        <span className="text-2xl">⏱️</span>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Total Duration</p>
                        <p className="font-bold text-slate-900 dark:text-white text-lg sm:text-xl">2h 44min</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-linear-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-5 border border-purple-100 dark:border-purple-900/30">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center shadow-md">
                        <span className="text-2xl">📋</span>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Test Sections</p>
                        <p className="font-bold text-slate-900 dark:text-white text-lg sm:text-xl">4 Parts</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Four Sections Grid */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                  <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">🎧</span>
                      <div>
                        <p className="font-bold text-sm sm:text-base">Listening</p>
                        <p className="text-xs sm:text-sm opacity-90">30 minutes</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-linear-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">📖</span>
                      <div>
                        <p className="font-bold text-sm sm:text-base">Reading</p>
                        <p className="text-xs sm:text-sm opacity-90">60 minutes</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-linear-to-br from-purple-500 to-pink-600 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">✍️</span>
                      <div>
                        <p className="font-bold text-sm sm:text-base">Writing</p>
                        <p className="text-xs sm:text-sm opacity-90">60 minutes</p>
                      </div>
                    </div>
                  </div>

                  <div className="relative bg-linear-to-br from-orange-500 to-red-600 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
                    <div className="absolute inset-0 backdrop-blur-sm bg-white/10 z-10"></div>
                    <div className="absolute top-2 right-2 z-20 bg-white text-orange-600 px-3 py-1 rounded-full text-xs font-bold shadow-md">
                      SOON
                    </div>
                    <div className="flex items-center gap-2 mb-1 relative z-10 opacity-60">
                      <span className="text-2xl">🗣️</span>
                      <div>
                        <p className="font-bold text-sm sm:text-base">Speaking</p>
                        <p className="text-xs sm:text-sm opacity-90">14 minutes</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Attempt Warning */}
              {activeAttempt && (
                <div className="mb-6 p-5 bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-2 border-amber-400 dark:border-amber-600 rounded-2xl">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shrink-0 shadow-md">
                      <span className="text-white text-2xl">⚠️</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-amber-900 dark:text-amber-100 text-lg mb-2">
                        Active Exam in Progress
                      </h3>
                      <p className="text-amber-800 dark:text-amber-200 text-sm mb-3">
                        You have an incomplete exam: <span className="font-semibold">{activeAttempt.exam_title}</span>
                        <br />
                        Current section: <span className="font-semibold capitalize">{activeAttempt.current_section}</span>
                      </p>
                      <p className="text-amber-700 dark:text-amber-300 text-xs mb-4">
                        Please complete your current exam before starting a new one. Your progress has been saved.
                      </p>
                      <button
                        onClick={handleResumeTest}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-md"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Resume Exam
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Start Button */}
              <button 
                onClick={handleStartTest}
                disabled={loading || !fullTestExam || !!activeAttempt}
                className="w-full py-5 sm:py-6 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-lg sm:text-xl hover:shadow-2xl hover:shadow-blue-500/50 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Starting Test...</span>
                  </>
                ) : (
                  <>
                    <span>Start Full IELTS Test</span>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Checklist (2 cols on large screens) */}
            <div className="lg:col-span-2">
              <div className="bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-md">
                    <span className="text-white text-lg">ℹ️</span>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg sm:text-xl">Before You Start</h3>
                </div>

                <div className="space-y-3 flex-1">
                  <div className="flex items-start gap-3 bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">✓</span>
                    </div>
                    <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300">
                      Stable internet connection required
                    </p>
                  </div>

                  <div className="flex items-start gap-3 bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">✓</span>
                    </div>
                    <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300">
                      Quiet environment free from distractions
                    </p>
                  </div>

                  <div className="flex items-start gap-3 bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">✓</span>
                    </div>
                    <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300">
                      Headphones for listening section
                    </p>
                  </div>

                  <div className="flex items-start gap-3 bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">✓</span>
                    </div>
                    <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300">
                      Microphone access for speaking
                    </p>
                  </div>

                  <div className="flex items-start gap-3 bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4 border-2 border-amber-300 dark:border-amber-700">
                    <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shrink-0 mt-0.5 shadow-md">
                      <span className="text-white text-sm font-bold">!</span>
                    </div>
                    <p className="text-sm sm:text-base text-amber-900 dark:text-amber-100 font-semibold">
                      Cannot pause once started
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
    </div>
  );
}