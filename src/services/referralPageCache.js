import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@referral_page_v1';

const DEFAULT_STATS = {
  totalReferrals: 0,
  totalRewardsPaid: 0,
  topReferrer: null,
  membersViaReferrals: 0,
};

function cacheKey(filter) {
  return `${CACHE_PREFIX}:${filter || 'all'}`;
}

export function getDefaultStats() {
  return { ...DEFAULT_STATS };
}

export async function loadReferralPageCache(filter) {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(filter));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      stats: parsed.stats || getDefaultStats(),
      referrals: Array.isArray(parsed.referrals) ? parsed.referrals : [],
      total: parsed.total ?? parsed.referrals?.length ?? 0,
      hasMore: Boolean(parsed.hasMore),
      updatedAt: parsed.updatedAt || null,
    };
  } catch {
    return null;
  }
}

export async function saveReferralPageCache(filter, data) {
  try {
    const payload = {
      stats: data.stats || getDefaultStats(),
      referrals: data.referrals || [],
      total: data.total ?? data.referrals?.length ?? 0,
      hasMore: Boolean(data.hasMore),
      updatedAt: Date.now(),
    };
    await AsyncStorage.setItem(cacheKey(filter), JSON.stringify(payload));
    return payload;
  } catch {
    return null;
  }
}

export function mergeReferralIntoCache(cache, referral) {
  if (!referral?._id) return cache;
  const referrals = cache?.referrals || [];
  const exists = referrals.some((r) => String(r._id) === String(referral._id));
  if (exists) return cache;

  const next = {
    ...cache,
    referrals: [referral, ...referrals],
    total: (cache?.total ?? referrals.length) + 1,
    stats: {
      ...(cache?.stats || getDefaultStats()),
      totalReferrals: (cache?.stats?.totalReferrals ?? referrals.length) + 1,
      membersViaReferrals: (cache?.stats?.membersViaReferrals ?? 0) + 1,
    },
    updatedAt: Date.now(),
  };
  return next;
}

export function mergeStatsIntoCache(cache, stats) {
  if (!stats) return cache;
  return {
    ...cache,
    stats: { ...(cache?.stats || getDefaultStats()), ...stats },
    updatedAt: Date.now(),
  };
}

export function appendReferralsToCache(cache, newReferrals, meta) {
  const existing = cache?.referrals || [];
  const ids = new Set(existing.map((r) => String(r._id)));
  const merged = [...existing];
  for (const r of newReferrals || []) {
    if (!ids.has(String(r._id))) {
      merged.push(r);
      ids.add(String(r._id));
    }
  }
  return {
    ...cache,
    referrals: merged,
    total: meta?.total ?? cache?.total ?? merged.length,
    hasMore: meta?.hasMore ?? false,
    updatedAt: Date.now(),
  };
}
