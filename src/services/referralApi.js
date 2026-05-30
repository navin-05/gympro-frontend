import apiClient from '../api/client';

export async function fetchReferralStats({ skipSync = false } = {}) {
  const qs = skipSync ? '?skipSync=1' : '';
  const res = await apiClient.get(`/referrals/stats${qs}`);
  return res.data || {};
}

export async function fetchReferralList({ filter = 'all', limit, skip = 0, skipSync = false } = {}) {
  const params = new URLSearchParams();
  params.set('filter', filter);
  if (limit !== undefined) params.set('limit', String(limit));
  if (skip > 0) params.set('skip', String(skip));
  if (skipSync) params.set('skipSync', '1');

  const res = await apiClient.get(`/referrals/list?${params.toString()}`);
  const data = res.data;

  if (Array.isArray(data)) {
    return {
      referrals: data,
      total: data.length,
      skip: 0,
      limit: data.length,
      hasMore: false,
    };
  }

  return {
    referrals: data?.referrals || [],
    total: data?.total ?? 0,
    skip: data?.skip ?? skip,
    limit: data?.limit ?? limit,
    hasMore: Boolean(data?.hasMore),
  };
}
