import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchReferralStats, fetchReferralList } from '../services/referralApi';
import {
  loadReferralPageCache,
  saveReferralPageCache,
  getDefaultStats,
  mergeReferralIntoCache,
  mergeStatsIntoCache,
} from '../services/referralPageCache';
import {
  connectReferralSocket,
  disconnectReferralSocket,
} from '../services/referralSocket';

const INITIAL_BATCH = 3;
const PAGE_SIZE = 20;

export function useReferralPage(filter) {
  const [stats, setStats] = useState(getDefaultStats());
  const [referrals, setReferrals] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [statsRefreshing, setStatsRefreshing] = useState(false);
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hydratedFromCache, setHydratedFromCache] = useState(false);

  const syncedFiltersRef = useRef(new Set());
  const loadingMoreRef = useRef(false);
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const applyCache = useCallback((cache) => {
    if (!cache) return;
    setStats(cache.stats || getDefaultStats());
    setReferrals(cache.referrals || []);
    setTotal(cache.total ?? cache.referrals?.length ?? 0);
    setHasMore(Boolean(cache.hasMore));
    setHydratedFromCache(true);
  }, []);

  const loadStats = useCallback(async ({ skipSync = false, silent = false } = {}) => {
    if (!silent) setStatsRefreshing(true);
    try {
      const data = await fetchReferralStats({ skipSync });
      setStats(data);
      const cached = await loadReferralPageCache(filterRef.current);
      await saveReferralPageCache(filterRef.current, {
        stats: data,
        referrals: cached?.referrals ?? [],
        total: cached?.total ?? 0,
        hasMore: cached?.hasMore ?? false,
      });
      return data;
    } catch (err) {
      console.log('[ReferralPage] stats error:', err.message);
      return null;
    } finally {
      if (!silent) setStatsRefreshing(false);
    }
  }, []);

  const loadReferrals = useCallback(async ({
    skip = 0,
    limit = skip === 0 ? INITIAL_BATCH : PAGE_SIZE,
    skipSync = false,
    append = false,
  } = {}) => {
    if (skip === 0) setReferralsLoading(true);
    else {
      setLoadingMore(true);
      loadingMoreRef.current = true;
    }

    try {
      const page = await fetchReferralList({
        filter: filterRef.current,
        limit,
        skip,
        skipSync,
      });

      setTotal(page.total);
      setHasMore(page.hasMore);

      if (append) {
        setReferrals((prev) => {
          const ids = new Set(prev.map((r) => String(r._id)));
          const next = [...prev];
          for (const r of page.referrals) {
            if (!ids.has(String(r._id))) next.push(r);
          }
          loadReferralPageCache(filterRef.current).then((cached) => {
            saveReferralPageCache(filterRef.current, {
              stats: cached?.stats || getDefaultStats(),
              referrals: next,
              total: page.total,
              hasMore: page.hasMore,
            });
          });
          return next;
        });
      } else {
        setReferrals(page.referrals);
        loadReferralPageCache(filterRef.current).then((cached) => {
          saveReferralPageCache(filterRef.current, {
            stats: cached?.stats || getDefaultStats(),
            referrals: page.referrals,
            total: page.total,
            hasMore: page.hasMore,
          });
        });
      }

      return page;
    } catch (err) {
      console.log('[ReferralPage] list error:', err.message);
      return null;
    } finally {
      if (skip === 0) setReferralsLoading(false);
      else {
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    }
  }, []);

  const refreshInBackground = useCallback(async () => {
    const skipSync = syncedFiltersRef.current.has(filterRef.current);
    await loadStats({ skipSync: true, silent: true });
    await loadReferrals({ skip: 0, limit: INITIAL_BATCH, skipSync: true, append: false });
  }, [loadStats, loadReferrals]);

  const loadPage = useCallback(async (f) => {
    filterRef.current = f;
    const cached = await loadReferralPageCache(f);
    if (cached) applyCache(cached);

    const needsSync = !syncedFiltersRef.current.has(f);

    await loadStats({ skipSync: !needsSync, silent: Boolean(cached) });
    if (needsSync) syncedFiltersRef.current.add(f);

    setTimeout(() => {
      loadReferrals({
        skip: 0,
        limit: INITIAL_BATCH,
        skipSync: !needsSync,
        append: false,
      });
    }, 0);

    if (cached) {
      refreshInBackground();
    }
  }, [applyCache, loadStats, loadReferrals, refreshInBackground]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMoreRef.current || referralsLoading) return;
    loadReferrals({
      skip: referrals.length,
      limit: PAGE_SIZE,
      skipSync: true,
      append: true,
    });
  }, [hasMore, referrals.length, referralsLoading, loadReferrals]);

  const onRealtimeReferral = useCallback((payload) => {
    const referral = payload?.referral;
    if (!referral?._id) return;

    setReferrals((prev) => {
      if (prev.some((r) => String(r._id) === String(referral._id))) return prev;
      const next = [referral, ...prev];
      const cache = mergeReferralIntoCache(
        { stats, referrals: prev, total, hasMore },
        referral
      );
      setStats(cache.stats);
      setTotal(cache.total);
      saveReferralPageCache(filterRef.current, cache);
      return next;
    });

    if (payload?.stats) {
      setStats((prev) => {
        const merged = { ...prev, ...payload.stats };
        saveReferralPageCache(filterRef.current, {
          stats: merged,
          referrals,
          total,
          hasMore,
        });
        return merged;
      });
    }
  }, [stats, referrals, total, hasMore]);

  const onRealtimeStats = useCallback((payload) => {
    if (!payload?.stats) return;
    setStats((prev) => {
      const merged = mergeStatsIntoCache({ stats: prev, referrals, total, hasMore }, payload.stats).stats;
      saveReferralPageCache(filterRef.current, {
        stats: merged,
        referrals,
        total,
        hasMore,
      });
      return merged;
    });
  }, [referrals, total, hasMore]);

  useEffect(() => {
    connectReferralSocket({
      onReferralCreated: onRealtimeReferral,
      onStatsUpdated: onRealtimeStats,
    });
    return () => disconnectReferralSocket();
  }, [onRealtimeReferral, onRealtimeStats]);

  return {
    stats,
    referrals,
    total,
    hasMore,
    statsRefreshing,
    referralsLoading,
    loadingMore,
    hydratedFromCache,
    loadPage,
    loadMore,
    loadStats,
    loadReferrals,
  };
}

export { INITIAL_BATCH, PAGE_SIZE };
