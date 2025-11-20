'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

interface GoogleSignInButtonProps {
  text?: string;
  className?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function GoogleSignInButton({ 
  text = 'Continue with Google',
  className = '',
  onSuccess,
  onError 
}: GoogleSignInButtonProps) {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    
    try {
      // Load Google Identity Services library
      const google = (window as any).google;
      
      if (!google) {
        throw new Error('Google Sign-In not loaded');
      }

      // Initialize Google Sign-In
      google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });

      // Prompt the user to sign in
      google.accounts.id.prompt();
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      const errorMessage = error.message || 'Failed to initialize Google Sign-In';
      if (onError) {
        onError(errorMessage);
      }
      setLoading(false);
    }
  };

  const handleCredentialResponse = async (response: any) => {
    try {
      // Send the credential to your backend
      const apiResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/accounts/api/google-auth/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: response.credential,
          }),
        }
      );

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || 'Authentication failed');
      }

      const data = await apiResponse.json();

      // Store tokens
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Refresh user state in AuthProvider
      await refreshUser();
      
      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));

      if (onSuccess) {
        onSuccess();
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Authentication error:', error);
      const errorMessage = error.message || 'Authentication failed';
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      disabled={loading}
      className={`w-full flex items-center justify-center gap-3 px-6 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold rounded-xl transition-all duration-300 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>{text}</span>
        </>
      )}
    </button>
  );
}
