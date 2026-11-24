import { QueryClient } from '@tanstack/react-query';

/**
 * Global QueryClient instance for React Query v5.
 * Configured with sane institutional defaults:
 * - staleTime: 60 seconds (data is considered fresh for 1 min, avoiding redundant network requests)
 * - gcTime: 5 minutes (inactive cache entries are retained in memory for 5 mins)
 * - refetchOnWindowFocus: false (avoids sudden layout shifts or refetches on tab focus)
 * - retry: 1 (retries once on failure before surfacing an error)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
