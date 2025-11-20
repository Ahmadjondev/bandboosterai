'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { sendVerificationCode, verifyCode } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    // Check if user is already verified
    const user = getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }

    if (user.is_verified) {
      router.push("/dashboard");
      return;
    }

    // Auto-send verification code on page load
    handleSendCode();
  }, []);

  useEffect(() => {
    // Countdown timer
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !canResend) {
      setCanResend(true);
    }
  }, [timeLeft, canResend]);

  const handleSendCode = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      const response = await sendVerificationCode();
      setSuccess(response.message);
      setTimeLeft(response.expires_in_seconds || 120);
      setCanResend(false);
      // Focus first input
      inputRefs[0].current?.focus();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto-submit when all digits are entered
    if (newCode.every((digit) => digit !== "") && index === 3) {
      handleVerify(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    
    // Check if pasted data is 4 digits
    if (/^\d{4}$/.test(pastedData)) {
      const newCode = pastedData.split("");
      setCode(newCode);
      inputRefs[3].current?.focus();
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (codeToVerify?: string) => {
    const verificationCode = codeToVerify || code.join("");
    
    if (verificationCode.length !== 4) {
      setError("Please enter all 4 digits");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await verifyCode(verificationCode);
      setSuccess(response.message);
      
      // Redirect to dashboard after 1 second
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid verification code");
      setCode(["", "", "", ""]);
      inputRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-600 via-indigo-700 to-indigo-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl  p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-linear-to-br from-blue-600 to-indigo-900 dark:from-purple-500 dark:to-indigo-600 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Verify Your Email</h1>
          <p className="text-gray-600 dark:text-slate-400">
            We've sent a 4-digit verification code to your email address
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 rounded">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 dark:text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-400 rounded">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-green-800 dark:text-green-200 text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* Code Input */}
        <div className="mb-6">
          <div className="flex justify-center gap-3">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={inputRefs[index]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-16 h-16 text-center text-2xl font-bold border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:border-purple-600 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-500/30 outline-none transition-all"
                disabled={loading}
              />
            ))}
          </div>
        </div>

        {/* Timer */}
        {timeLeft > 0 && (
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Code expires in <span className="font-bold text-purple-600 dark:text-purple-400">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
            </p>
          </div>
        )}

        {/* Resend Button */}
        <div className="text-center mb-6">
          <button
            onClick={handleSendCode}
            disabled={!canResend || loading}
            className={`text-sm font-medium ${
              canResend && !loading
                ? "text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 cursor-pointer"
                : "text-gray-400 dark:text-slate-500 cursor-not-allowed"
            }`}
          >
            {loading ? "Sending..." : canResend ? "Resend Code" : "Resend available after code expires"}
          </button>
        </div>

        {/* Verify Button */}
        <button
          onClick={() => handleVerify()}
          disabled={loading || code.some((digit) => !digit)}
          className="w-full bg-linear-to-r from-blue-600 to-indigo-700 dark:from-blue-500 dark:to-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-800 dark:hover:from-blue-600 dark:hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? "Verifying..." : "Verify Email"}
        </button>

        {/* Back to Dashboard */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
