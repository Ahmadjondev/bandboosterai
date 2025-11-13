/**
 * Authentication Provider
 * Handles user session management and authentication state
 */

"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { fetchCurrentUser } from "@/lib/auth";
import { getAccessToken } from "@/lib/api-client";
import type { User } from "@/types/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
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

    const publicPaths = ["/", "/login", "/register", "/verify-email", "/forgot-password"];
    const isPublicPath = publicPaths.includes(pathname);

    if (!user && !isPublicPath) {
      // Not authenticated and trying to access protected route
      console.log('[AuthProvider] Redirecting to login - no user and protected route');
      router.push("/login");
    } else if (user && (pathname === "/login" || pathname === "/register")) {
      // Authenticated user trying to access login/register
      // Redirect based on role
      console.log('[AuthProvider] Redirecting authenticated user away from login/register');
      if (user.role === "SUPERADMIN") {
        router.push("/superadmin");
      } else if (user.role === "MANAGER") {
        router.push("/manager");
      } else {
        router.push("/dashboard");
      }
    } else {
      console.log('[AuthProvider] No redirect needed');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, pathname]);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
