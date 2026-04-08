import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const DEFAULT_STALE_MS = 30_000;

const isOlderThan = (ts, ms) => {
  if (!ts) return true;
  return (Date.now() - ts) > ms;
};

/**
 * useCachedQuery(key, fetchFn)
 *
 * - Returns cached data immediately (React Query cache)
 * - On mount/focus, silently refetches in background only when stale
 * - Prevents duplicate calls (won't refetch if already fetching)
 * - Never clears old data (no flicker)
 */
export function useCachedQuery(key, fetchFn, options = {}) {
  const queryClient = useQueryClient();
  const staleMs = options.staleMs ?? DEFAULT_STALE_MS;

  const queryKey = useMemo(() => [key], [key]);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      return await fetchFn();
    },
    staleTime: staleMs,
    gcTime: options.gcTime ?? 5 * 60_000,
    refetchOnMount: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });

  const hasCache = query.data !== undefined;
  const shouldBackgroundRefresh = hasCache && isOlderThan(query.dataUpdatedAt, staleMs);

  useEffect(() => {
    if (!shouldBackgroundRefresh) return;
    if (query.isFetching) return;

    console.log('🔥 BACKGROUND REFRESH:', key);
    query.refetch({ cancelRefetch: false });
  }, [key, shouldBackgroundRefresh, query.isFetching, query.refetch]);

  const invalidateCache = () => {
    queryClient.invalidateQueries({ queryKey, refetchType: 'none' });
  };

  return {
    ...query,
    invalidateCache,
    hasCache,
  };
}

