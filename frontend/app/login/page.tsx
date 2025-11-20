'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { loginUser } from '@/lib/auth';
import { validateLoginForm } from '@/lib/validation';
import { useAuth } from '@/components/AuthProvider';
import GoogleSignInButton from '@/components/GoogleSignInButton';

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError('');

    // Validate form
    const validation = validateLoginForm(formData.username, formData.password);
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
      console.log('[Login] Attempting login...');
      const response = await loginUser({
        username: formData.username,
        password: formData.password,
      });

      console.log('[Login] Login successful, user:', response.user.username, 'role:', response.user.role);
      
      // JWT tokens and user data are now stored in localStorage by loginUser()
      
      // Refresh user state in AuthProvider to prevent redirect back to login
      console.log('[Login] Calling refreshUser...');
      await refreshUser();
      console.log('[Login] refreshUser completed');
      
      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if email is verified for students
      if (response.user.role === 'STUDENT' && !response.user.is_verified) {
        console.log('[Login] Email not verified, redirecting to verification page...');
        router.push('/verify-email');
        return;
      }
      
      // Redirect based on user role
      console.log('[Login] Redirecting to appropriate dashboard...');
      if (response.user.role === 'MANAGER') {
        router.push('/manager');
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      // Handle API validation errors
      if (error.response && error.response.data) {
        const apiErrors = error.response.data;
        const newErrors: Record<string, string> = {};
        
        // Map API errors to form fields
        if (apiErrors.username) {
          newErrors.username = Array.isArray(apiErrors.username) 
            ? apiErrors.username[0] 
            : apiErrors.username;
        }
        if (apiErrors.password) {
          newErrors.password = Array.isArray(apiErrors.password) 
            ? apiErrors.password[0] 
            : apiErrors.password;
        }
        
        // If we have field-specific errors, set them
        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          setGeneralError('Please fix the errors below and try again.');
        } else if (apiErrors.error) {
          // Handle general error from API
          setGeneralError(
            Array.isArray(apiErrors.error) ? apiErrors.error[0] : apiErrors.error
          );
        } else if (apiErrors.detail) {
          setGeneralError(
            Array.isArray(apiErrors.detail) ? apiErrors.detail[0] : apiErrors.detail
          );
        } else {
          setGeneralError('Invalid credentials. Please try again.');
        }
      } else if (error.message) {
        setGeneralError(error.message);
      } else {
        setGeneralError('Unable to login. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-6 bg-white dark:bg-slate-900 overflow-y-auto">
        <div className="w-full max-w-md space-y-5 my-6">
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
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-4">
              Welcome Back
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Sign in to continue your IELTS preparation
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
                    Login Failed
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

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              label="Username or Email"
              placeholder="Enter your username or email"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              error={errors.username}
              required
              autoComplete="username"
            />

            <Input
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              error={errors.password}
              required
              autoComplete="current-password"
              showPasswordToggle
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Remember me
                </span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-slate-900 text-slate-500">
                Or sign in with
              </span>
            </div>
          </div>

          {/* Google Sign-In */}
          <GoogleSignInButton 
            text="Sign in with Google"
            onError={(error) => setGeneralError(error)}
          />

          {/* Telegram Login */}
          <Link
            href="/register/telegram"
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-linear-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
            Sign in with Telegram
          </Link>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-slate-900 text-slate-500">
                New here?
              </span>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <Link
              href="/register"
              className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Create an account
            </Link>
          </div>
        </div>
      </div>

      {/* Right side - Image/Gradient */}
      <div className="hidden lg:flex flex-1 bg-linear-to-br from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-blue-600/90 via-indigo-600/90 to-purple-600/90"></div>
        
        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center text-white p-12 space-y-8">
          <div className="space-y-6">
            <h2 className="text-5xl font-bold">
              Start Your Journey to
              <span className="block mt-2">IELTS Success</span>
            </h2>
            <p className="text-xl text-blue-100 max-w-md mx-auto">
              Join thousands of students who have achieved their dream scores with our platform
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-12">
            <div className="space-y-2">
              <div className="text-4xl font-bold">500+</div>
              <div className="text-blue-100">Questions</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold">50+</div>
              <div className="text-blue-100">Authentic Mock Tests</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold">1K+</div>
              <div className="text-blue-100">Students</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
