/**
 * Authentication Provider
 * Handles user session management and authentication state
 */

"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { fetchCurrentUser } from "@/lib/auth";
import { getAccessToken, clearTokens, setGlobalLogoutHandler } from "@/lib/api-client";
import type { User } from "@/types/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Logout function
  const logout = useCallback(() => {
    console.log('[AuthProvider] Logging out user');
    clearTokens();
    setUser(null);
    
    // Clear cached user data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
    
    // Redirect to login
    router.push('/login');
  }, [router]);

  const refreshUser = async () => {
    try {
      console.log('[AuthProvider] refreshUser called');
      setLoading(true);
      
      // First check if we have a JWT token
      const token = getAccessToken();
      console.log('[AuthProvider] Token exists:', !!token);
      
      // If no token, check localStorage for cached user data
      if (!token) {
        if (typeof window !== 'undefined') {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              console.log('[AuthProvider] Using cached user:', parsedUser.username);
              setUser(parsedUser);
              setLoading(false);
              return;
            } catch (e) {
              // Invalid JSON, clear it
              console.error('[AuthProvider] Invalid cached user data');
              localStorage.removeItem('user');
            }
          }
        }
        console.log('[AuthProvider] No token or cached user, setting user to null');
        setUser(null);
        setLoading(false);
        return; // Don't make API call without token
      }
      
      // We have a token - validate with backend
      // (JWT will be sent automatically via Authorization header)
      console.log('[AuthProvider] Fetching current user from API');
      const currentUser = await fetchCurrentUser();
      console.log('[AuthProvider] API response - user:', currentUser?.username);
      setUser(currentUser);
      setLoading(false);
    } catch (error) {
      // Silently handle errors - fetchCurrentUser already returns null on error
      console.error('[AuthProvider] Error in refreshUser:', error);
      setUser(null);
      setLoading(false);
    }
  };

  // Register logout handler with API client
  useEffect(() => {
    setGlobalLogoutHandler(logout);
    
    return () => {
      setGlobalLogoutHandler(null);
    };
  }, [logout]);

  useEffect(() => {
    // Check authentication on mount
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Redirect logic after user is loaded
    if (loading) {
      console.log('[AuthProvider] Still loading, skipping redirect logic');
      return;
    }

    console.log('[AuthProvider] Redirect logic - user:', user?.username || 'null', 'pathname:', pathname);

    const publicPaths = ["/", "/login", "/register", "/verify-email", "/forgot-password","/register/telegram", "/privacy", "/terms"];
    const isPublicPath = publicPaths.includes(pathname);

    if (!user && !isPublicPath) {
      // Not authenticated and trying to access protected route
      console.log('[AuthProvider] Redirecting to login - no user and protected route');
      router.push("/login");
    } else if (user && (pathname === "/login" || pathname === "/register")) {
      // Authenticated user trying to access login/register
      // Redirect based on role
      console.log('[AuthProvider] Redirecting authenticated user away from login/register');
      if (user.role === "MANAGER") {
        router.push("/manager");
      } else if (user.role === "TEACHER") {
        router.push("/teacher");
      } else {
        // For students, check onboarding first
        if (!user.onboarding_completed) {
          router.push("/onboarding");
        } else {
          router.push("/dashboard");
        }
      }
    } else if (user && user.role === "STUDENT" && !user.onboarding_completed && pathname !== "/onboarding") {
      // Student without completed onboarding trying to access any page except onboarding
      // Allow them to access verify-email if needed
      const allowedPathsForOnboarding = ['/onboarding', '/verify-email', '/logout'];
      const isAllowedForOnboarding = allowedPathsForOnboarding.some(path => pathname.startsWith(path));
      
      if (!isAllowedForOnboarding && !isPublicPath) {
        console.log('[AuthProvider] Redirecting student to onboarding - not completed');
        router.push('/onboarding');
      }
    } else if (user && !user.is_verified) {
      // Check if email verification is required for this route
      const allowedPathsForUnverified = ['/dashboard', '/verify-email', '/logout', '/profile', '/onboarding'];
      const isAllowedPath = allowedPathsForUnverified.some(path => pathname.startsWith(path));
      
      if (!isAllowedPath && pathname !== '/verify-email') {
        console.log('[AuthProvider] Redirecting unverified user to verify-email page');
        router.push('/verify-email');
      }
    } else {
      console.log('[AuthProvider] No redirect needed');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, pathname]);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
