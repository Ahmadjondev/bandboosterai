import { SWRConfiguration } from 'swr';

// SWR global configuration for optimal performance
export const swrConfig: SWRConfiguration = {
  // Revalidate on focus to keep data fresh
  revalidateOnFocus: false,
  
  // Revalidate on reconnect
  revalidateOnReconnect: true,
  
  // Dedupe requests within 2 seconds
  dedupingInterval: 2000,
  
  // Keep data fresh for 5 minutes
  focusThrottleInterval: 300000,
  
  // Cache data for better performance
  revalidateIfStale: true,
  
  // Retry on error
  shouldRetryOnError: true,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  
  // Loading timeout
  loadingTimeout: 3000,
  
  // Suspense mode disabled (using manual loading states)
  suspense: false,
  
  // Compare function for deep equality
  compare: (a, b) => {
    return JSON.stringify(a) === JSON.stringify(b);
  }
};

// Cache keys for consistent data fetching
export const cacheKeys = {
  dashboard: '/exams/api/dashboard/stats/',
  myTests: '/exams/api/my-attempts/',
  books: '/manager/api/books/',
  profile: '/accounts/api/profile/',
  leaderboard: '/exams/api/leaderboard/',
} as const;
