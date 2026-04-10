import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const DEFAULT_STALE_MS = 1000 * 60 * 5;

/**
 * useCachedQuery(key, fetchFn)
 *
 * Shared React Query wrapper: long stale window, no focus/reconnect refetch storms.
 * Use pull-to-refresh or explicit refetch() when fresh data is required.
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
    gcTime: options.gcTime ?? 10 * 60_000,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const invalidateCache = () => {
    queryClient.invalidateQueries({ queryKey, refetchType: 'none' });
  };

  return {
    ...query,
    invalidateCache,
    hasCache: query.data !== undefined,
  };
}
