'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { registerUser, sendVerificationCode } from '@/lib/auth';
import { validateRegisterForm } from '@/lib/validation';
import { Mail, CheckCircle } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export default function RegisterPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleResendEmail = async () => {
    try {
      setIsResending(true);
      setResendSuccess(false);
      await sendVerificationCode();
      setResendSuccess(true);
      
      // Reset success message after 3 seconds
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to resend email:', error);
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError('');

    // Validate form
    const validation = validateRegisterForm(
      formData.email,
      formData.password,
      formData.confirmPassword,
      formData.firstName,
      formData.lastName
    );

    if (!validation.isValid) {
      const errorObj: Record<string, string> = {};
      validation.errors.forEach((error) => {
        errorObj[error.field] = error.message;
      });
      setErrors(errorObj);
      return;
    }

    setIsLoading(true);

    try {
      const response = await registerUser({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      console.log(response);
      // JWT tokens and user data are stored in localStorage by registerUser()
      
      // Refresh user state in AuthProvider
      await refreshUser();

      // Send verification code immediately after registration
      try {
        await sendVerificationCode();
      } catch (error) {
        console.error('Failed to send verification code:', error);
        // Continue even if sending fails - user can resend later
      }

      // Redirect to email verification page
      router.push('/verify-email');
    } catch (error: any) {
      // Handle API validation errors
      if (error.response && error.response.data) {
        const apiErrors = error.response.data;
        const newErrors: Record<string, string> = {};
        
        // Map API errors to form fields
        if (apiErrors.username) {
          newErrors.email = Array.isArray(apiErrors.username) 
            ? apiErrors.username[0] 
            : apiErrors.username;
        }
        if (apiErrors.email) {
          newErrors.email = Array.isArray(apiErrors.email) 
            ? apiErrors.email[0] 
            : apiErrors.email;
        }
        if (apiErrors.first_name) {
          newErrors.firstName = Array.isArray(apiErrors.first_name) 
            ? apiErrors.first_name[0] 
            : apiErrors.first_name;
        }
        if (apiErrors.last_name) {
          newErrors.lastName = Array.isArray(apiErrors.last_name) 
            ? apiErrors.last_name[0] 
            : apiErrors.last_name;
        }
        if (apiErrors.password) {
          newErrors.password = Array.isArray(apiErrors.password) 
            ? apiErrors.password[0] 
            : apiErrors.password;
        }
        if (apiErrors.confirm_password) {
          newErrors.confirmPassword = Array.isArray(apiErrors.confirm_password) 
            ? apiErrors.confirm_password[0] 
            : apiErrors.confirm_password;
        }
        
        // If we have field-specific errors, set them
        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          setGeneralError('Please fix the errors below and try again.');
        } else {
          // Otherwise show a general error
          setGeneralError(
            apiErrors.detail || apiErrors.message || 'Registration failed. Please try again.'
          );
        }
      } else if (error.message) {
        setGeneralError(error.message);
      } else {
        setGeneralError('Registration failed. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image/Gradient */}
      <div className="hidden lg:flex flex-1 bg-linear-to-br from-indigo-600 via-purple-600 to-pink-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-600/90 via-purple-600/90 to-pink-600/90"></div>
        
        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center text-white p-12 space-y-8">
          <div className="space-y-6">
            <h2 className="text-5xl font-bold">
              Join 10,000+ Students
              <span className="block mt-2">Achieving Success</span>
            </h2>
            <p className="text-xl text-indigo-100 max-w-md mx-auto">
              Get started with your IELTS preparation journey today and reach your target score
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4 mt-12 text-left">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="font-semibold">Free Account</div>
                <div className="text-sm text-indigo-100">Start practicing immediately</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="font-semibold">Instant Access</div>
                <div className="text-sm text-indigo-100">1000+ practice questions</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="font-semibold">Progress Tracking</div>
                <div className="text-sm text-indigo-100">Monitor your improvement</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-slate-900">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Header */}
          <div className="text-center space-y-2">
            <Link href="/" className="inline-flex items-center justify-center gap-2">
                            <Image 
                src="/logo.svg" 
                alt="BandBooster Logo" 
                width={56} 
                height={56}
                className="w-14 h-14"
              />
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                BandBooster
              </h1>
            </Link>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mt-6">
              Create Account
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Start your IELTS preparation journey today
            </p>
          </div>

          {/* Error Alert */}
          {generalError && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500">
              <div className="flex items-start gap-3">
                <div className="shrink-0">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                    Registration Failed
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {generalError}
                  </p>
                </div>
                <button
                  onClick={() => setGeneralError('')}
                  className="shrink-0 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Success Message */}
          {showSuccessMessage ? (
            <div className="space-y-6 text-center py-8">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Account Created Successfully!
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  A verification email has been sent to:
                </p>
                <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                  {formData.email}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3 text-left">
                  <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-semibold mb-1">Please verify your email</p>
                    <p>
                      Check your inbox and click the verification link to activate your account. 
                      Don&apos;t forget to check your spam folder!
                    </p>
                  </div>
                </div>
              </div>

              {resendSuccess && (
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    ✓ Verification email sent successfully!
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={handleResendEmail}
                  variant="outline"
                  fullWidth
                  disabled={isResending}
                >
                  {isResending ? 'Sending...' : 'Resend Verification Email'}
                </Button>
                
                <Button
                  onClick={() => router.push('/dashboard')}
                  variant="primary"
                  fullWidth
                >
                  Go to Dashboard
                </Button>
              </div>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Redirecting automatically in 5 seconds...
              </p>
            </div>
          ) : (
            <>
              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="text"
                label="First Name"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                error={errors.firstName}
                required
                autoComplete="given-name"
              />
              <Input
                type="text"
                label="Last Name"
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                error={errors.lastName}
                required
                autoComplete="family-name"
              />
            </div>

            <Input
              type="email"
              label="Email Address"
              placeholder="john.doe@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              error={errors.email}
              required
              autoComplete="email"
            />

            <Input
              type="password"
              label="Password"
              placeholder="Create a strong password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              error={errors.password}
              helperText="At least 8 characters with letters and numbers"
              required
              autoComplete="new-password"
              showPasswordToggle
            />

            <Input
              type="password"
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              error={errors.confirmPassword}
              required
              autoComplete="new-password"
              showPasswordToggle
            />

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                required
                className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label className="text-sm text-slate-600 dark:text-slate-400">
                I agree to the{' '}
                <Link href="/terms" className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-slate-900 text-slate-500">
                Already have an account?
              </span>
            </div>
          </div>

          {/* Sign In Link */}
          <div className="text-center">
            <Link
              href="/login"
              className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Sign in instead
            </Link>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
