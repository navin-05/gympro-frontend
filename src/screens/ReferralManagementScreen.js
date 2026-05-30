import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Image, Modal, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../theme/colors';
import apiClient from '../api/client';
import { useReferralPage } from '../hooks/useReferralPage';

const FILTERS = [
  { key: 'all', label: 'All Time' },
  { key: 'month', label: 'This Month' },
  { key: 'today', label: 'Today' },
];

const TXN_TYPE_LABELS = {
  referral_reward: 'Referral Reward',
  joining_bonus: 'Joining Bonus',
  membership_discount: 'Wallet Discount Used',
  manual_credit: 'Manual Credit',
  manual_debit: 'Manual Debit',
};

const USAGE_TYPE_LABELS = {
  membership_discount: 'Membership Renewal',
  manual_debit: 'Wallet Payment',
};

function getTxnTypeLabel(type) {
  return TXN_TYPE_LABELS[type] || 'Transaction';
}

function getUsageLabel(type, description) {
  if (USAGE_TYPE_LABELS[type]) return USAGE_TYPE_LABELS[type];
  const desc = (description || '').toLowerCase();
  if (desc.includes('upgrade')) return 'Plan Upgrade';
  if (desc.includes('extension')) return 'Plan Extension';
  if (desc.includes('renewal')) return 'Membership Renewal';
  return 'Other Wallet Payment';
}

const USAGE_TXN_TYPES = new Set(['membership_discount', 'manual_debit', 'wallet_used', 'wallet_debit']);

function buildUsageFromTransactions(transactions) {
  if (!transactions?.length) return [];

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );
  let running = 0;
  const items = [];

  for (const txn of sorted) {
    running += Number(txn.amount) || 0;
    const amount = Number(txn.amount) || 0;
    const isUsage = USAGE_TXN_TYPES.has(txn.type)
      || (amount < 0 && txn.type !== 'referral_reward' && txn.type !== 'joining_bonus');

    if (!isUsage) continue;

    items.push({
      _id: txn._id,
      type: txn.type,
      description: txn.description || '',
      createdAt: txn.createdAt,
      walletUsed: Math.abs(amount),
      balanceAfter: running,
      paymentType: getUsageLabel(txn.type, txn.description),
      reference: txn.description || '',
    });
  }

  return items.reverse();
}

const ReferralManagementScreen = ({ navigation }) => {
  const [filter, setFilter] = useState('all');
  const {
    stats,
    referrals,
    statsRefreshing,
    referralsLoading,
    loadingMore,
    hydratedFromCache,
    loadPage,
    loadMore,
  } = useReferralPage(filter);

  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailMember, setDetailMember] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [usageRecords, setUsageRecords] = useState([]);
  const [totalReferralEarnings, setTotalReferralEarnings] = useState(0);

  useFocusEffect(useCallback(() => {
    loadPage(filter);
  }, [filter]));

  const onFilterChange = (f) => {
    setFilter(f);
  };

  const closeMemberDetail = () => {
    setDetailVisible(false);
    setDetailLoading(false);
    setDetailMember(null);
    setWalletBalance(0);
    setTransactions([]);
    setUsageRecords([]);
    setTotalReferralEarnings(0);
  };

  const openMemberDetail = async (memberRef) => {
    if (!memberRef?._id) return;

    setDetailVisible(true);
    setDetailLoading(true);
    setDetailMember({
      name: memberRef.name || 'Unknown',
      referralCode: memberRef.referralCode,
      mobile: memberRef.mobile,
      photo: memberRef.photo,
    });
    setWalletBalance(0);
    setTransactions([]);
    setUsageRecords([]);
    setTotalReferralEarnings(0);

    try {
      const [memberRes, walletRes, referredRes, usageRes] = await Promise.all([
        apiClient.get(`/members/${memberRef._id}`),
        apiClient.get(`/wallet/${memberRef._id}`),
        apiClient.get(`/wallet/${memberRef._id}/referred`),
        apiClient.get(`/wallet/${memberRef._id}/usage`).catch(() => ({ data: null })),
      ]);

      const member = memberRes.data || {};
      const wallet = walletRes.data || {};
      const referredTxns = referredRes.data || [];
      const txns = wallet.transactions || [];

      setDetailMember({
        name: member.name || memberRef.name || 'Unknown',
        mobile: member.mobile || '—',
        referralCode: member.referralCode || memberRef.referralCode || '—',
        photo: member.photo || memberRef.photo,
      });
      setWalletBalance(wallet.walletBalance ?? member.walletBalance ?? 0);
      setTransactions(txns);
      setUsageRecords(
        usageRes.data?.usage?.length
          ? usageRes.data.usage
          : buildUsageFromTransactions(txns)
      );
      setTotalReferralEarnings(
        referredTxns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
      );
    } catch (err) {
      console.log('[ReferralMgmt] Detail error:', err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const renderStatCards = () => (
    <View style={styles.statsGrid}>
      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: Colors.primary + '18' }]}>
          <Ionicons name="people" size={22} color={Colors.primary} />
        </View>
        <Text style={[styles.statValue, { color: Colors.primary }]}>{stats.totalReferrals}</Text>
        <Text style={styles.statLabel}>Total Referrals</Text>
      </View>
      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: Colors.secondary + '18' }]}>
          <Ionicons name="cash" size={22} color={Colors.secondary} />
        </View>
        <Text style={[styles.statValue, { color: Colors.secondary }]}>₹{stats.totalRewardsPaid}</Text>
        <Text style={styles.statLabel}>Rewards Paid</Text>
      </View>
      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: Colors.accent + '18' }]}>
          <Ionicons name="trophy" size={22} color={Colors.accent} />
        </View>
        <Text style={[styles.statValue, { color: Colors.accent }]} numberOfLines={1}>
          {stats.topReferrer?.name || '—'}
        </Text>
        <Text style={styles.statLabel}>Top Referrer</Text>
      </View>
      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: Colors.active + '18' }]}>
          <Ionicons name="person-add" size={22} color={Colors.active} />
        </View>
        <Text style={[styles.statValue, { color: Colors.active }]}>{stats.membersViaReferrals}</Text>
        <Text style={styles.statLabel}>Via Referrals</Text>
      </View>
    </View>
  );

  const renderReferralItem = ({ item }) => (
    <TouchableOpacity
      style={styles.referralCard}
      activeOpacity={0.75}
      onPress={() => openMemberDetail(item.referrerId)}
    >
      <View style={styles.referralRow}>
        <View style={styles.referralAvatarWrap}>
          {item.referrerId?.photo ? (
            <Image source={{ uri: item.referrerId.photo }} style={styles.referralAvatar} />
          ) : (
            <View style={styles.referralAvatarPlaceholder}>
              <Text style={styles.referralAvatarText}>
                {item.referrerId?.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.referralName}>{item.referrerId?.name || 'Unknown'}</Text>
          <Text style={styles.referralCode}>
            Code: {item.referrerId?.referralCode || '—'}
          </Text>
        </View>
        <View style={styles.referralRewardBadge}>
          <Text style={styles.referralRewardText}>
            ₹{item.referrerReward || 0}
          </Text>
          {(item.joiningReward || 0) > 0 && (
            <Text style={styles.referralRewardSub}>+ ₹{item.joiningReward} bonus</Text>
          )}
        </View>
      </View>
      <View style={styles.referralDetails}>
        <TouchableOpacity
          style={styles.referralDetailRow}
          activeOpacity={0.7}
          onPress={() => openMemberDetail(item.referredMemberId)}
        >
          <Ionicons name="arrow-forward" size={14} color={Colors.active} />
          <Text style={styles.referralDetailText}>
            Referred: {item.referredMemberId?.name || 'Unknown'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.referralDate}>{formatDate(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderMemberDetailModal = () => (
    <Modal visible={detailVisible} transparent animationType="slide" onRequestClose={closeMemberDetail}>
      <View style={detailStyles.overlay}>
        <View style={detailStyles.container}>
          <View style={detailStyles.header}>
            <Text style={detailStyles.title}>Member Wallet</Text>
            <TouchableOpacity onPress={closeMemberDetail} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {detailLoading ? (
            <View style={detailStyles.loadingWrap}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={detailStyles.loadingText}>Loading Wallet Details...</Text>
              <Text style={detailStyles.loadingSubText}>Loading Transactions...</Text>
            </View>
          ) : (
            <ScrollView
              style={detailStyles.scroll}
              contentContainerStyle={detailStyles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Member header */}
              <View style={detailStyles.memberHeader}>
                {detailMember?.photo ? (
                  <Image source={{ uri: detailMember.photo }} style={detailStyles.memberAvatar} />
                ) : (
                  <View style={detailStyles.memberAvatarPlaceholder}>
                    <Text style={detailStyles.memberAvatarText}>
                      {detailMember?.name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={detailStyles.memberName}>{detailMember?.name || 'Unknown'}</Text>
                  <Text style={detailStyles.memberMeta}>
                    Code: {detailMember?.referralCode || '—'}
                  </Text>
                  <Text style={detailStyles.memberMeta}>
                    Mobile: {detailMember?.mobile || '—'}
                  </Text>
                  <Text style={detailStyles.memberMeta}>
                    Total Referral Earnings: ₹{totalReferralEarnings}
                  </Text>
                </View>
              </View>

              {/* Wallet balance */}
              <View style={detailStyles.balanceCard}>
                <Text style={detailStyles.balanceLabel}>Available Wallet Balance</Text>
                <Text style={detailStyles.balanceValue}>₹{walletBalance}</Text>
              </View>

              {/* Recent transactions */}
              <Text style={detailStyles.sectionTitle}>Recent Transactions</Text>
              {transactions.length === 0 ? (
                <View style={detailStyles.emptyBlock}>
                  <Ionicons name="receipt-outline" size={28} color={Colors.textMuted} />
                  <Text style={detailStyles.emptyText}>No transactions yet</Text>
                </View>
              ) : (
                transactions.map((txn, i) => {
                  const amount = Number(txn.amount) || 0;
                  const isCredit = amount >= 0;
                  return (
                    <View key={txn._id || i} style={detailStyles.txnCard}>
                      <Text style={detailStyles.txnDate}>{formatDate(txn.createdAt)}</Text>
                      <Text style={detailStyles.txnType}>{getTxnTypeLabel(txn.type)}</Text>
                      <Text style={detailStyles.txnDesc}>{txn.description || '—'}</Text>
                      <Text style={[
                        detailStyles.txnAmount,
                        { color: isCredit ? Colors.active : Colors.expired },
                      ]}>
                        {isCredit ? '+' : '-'}₹{Math.abs(amount)}
                      </Text>
                    </View>
                  );
                })
              )}

              {/* Wallet usage history */}
              <Text style={[detailStyles.sectionTitle, { marginTop: 20 }]}>Wallet Usage History</Text>
              {usageRecords.length === 0 ? (
                <View style={detailStyles.emptyBlock}>
                  <Ionicons name="card-outline" size={28} color={Colors.textMuted} />
                  <Text style={detailStyles.emptyText}>No wallet usage yet</Text>
                </View>
              ) : (
                usageRecords.map((record, i) => (
                  <View key={record._id || `usage-${i}`} style={detailStyles.usageCard}>
                    <Text style={detailStyles.usageTitle}>
                      {record.paymentType || getUsageLabel(record.type, record.description)}
                    </Text>
                    <Text style={detailStyles.usageDate}>{formatDate(record.createdAt)}</Text>
                    {record.reference ? (
                      <Text style={detailStyles.usageReference}>{record.reference}</Text>
                    ) : null}
                    <View style={detailStyles.usageRow}>
                      <Text style={detailStyles.usageLabel}>Wallet Used:</Text>
                      <Text style={[detailStyles.usageValue, { color: Colors.expired }]}>
                        ₹{record.walletUsed}
                      </Text>
                    </View>
                    <View style={detailStyles.usageRow}>
                      <Text style={detailStyles.usageLabel}>Balance After:</Text>
                      <Text style={[detailStyles.usageValue, { color: Colors.active }]}>
                        ₹{Math.max(0, record.balanceAfter)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Referral Management</Text>
        <View style={{ width: 40 }} />
      </View>

      {renderStatCards()}

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => onFilterChange(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Referral Records</Text>
      {statsRefreshing && hydratedFromCache ? (
        <Text style={styles.refreshHint}>Updating stats…</Text>
      ) : null}
    </View>
  );

  const renderListFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.listFooter}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      );
    }
    return null;
  };

  const showReferralsEmpty = !referralsLoading && referrals.length === 0;
  const showReferralsLoading = referralsLoading && referrals.length === 0 && !hydratedFromCache;

  return (
    <>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={referrals}
        keyExtractor={(item) => item._id}
        renderItem={renderReferralItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderListFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          showReferralsLoading ? (
            <View style={styles.listFooter}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : showReferralsEmpty ? (
            <View style={styles.emptyState}>
              <Ionicons name="gift-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No referrals yet</Text>
              <Text style={styles.emptyHint}>
                Referrals will appear here when members use referral codes
              </Text>
            </View>
          ) : null
        }
      />
      {renderMemberDetailModal()}
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.card,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20,
  },
  statCard: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 14,
    width: '48%', marginBottom: 10, borderWidth: 1, borderColor: Colors.border,
  },
  statIcon: {
    width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  statValue: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },

  filterRow: {
    flexDirection: 'row', gap: 8, marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryGlow, borderColor: Colors.primary,
  },
  filterText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  filterTextActive: { color: Colors.primary, fontWeight: '600' },

  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  refreshHint: { fontSize: 12, color: Colors.textMuted, marginBottom: 8 },
  listFooter: { alignItems: 'center', paddingVertical: 16 },

  referralCard: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  referralRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  referralAvatarWrap: { marginRight: 12 },
  referralAvatar: { width: 42, height: 42, borderRadius: 21 },
  referralAvatarPlaceholder: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primaryGlow,
    justifyContent: 'center', alignItems: 'center',
  },
  referralAvatarText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  referralName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  referralCode: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  referralRewardBadge: {
    backgroundColor: Colors.primaryGlow, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  referralRewardText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  referralRewardSub: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, marginTop: 2 },
  referralDetails: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  referralDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  referralDetailText: { fontSize: 13, color: Colors.textSecondary },
  referralDate: { fontSize: 12, color: Colors.textMuted },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.textSecondary, marginTop: 12 },
  emptyHint: { fontSize: 14, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
});

const detailStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40, maxHeight: '88%',
    borderWidth: 1, borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: 24 },
  loadingWrap: { alignItems: 'center', paddingVertical: 48 },
  loadingText: { fontSize: 15, fontWeight: '600', color: Colors.text, marginTop: 16 },
  loadingSubText: { fontSize: 13, color: Colors.textMuted, marginTop: 6 },

  memberHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 16,
    backgroundColor: Colors.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  memberAvatar: { width: 52, height: 52, borderRadius: 26, marginRight: 12 },
  memberAvatarPlaceholder: {
    width: 52, height: 52, borderRadius: 26, marginRight: 12,
    backgroundColor: Colors.primaryGlow, justifyContent: 'center', alignItems: 'center',
  },
  memberAvatarText: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  memberName: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  memberMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  balanceCard: {
    backgroundColor: Colors.activeBg, borderRadius: 14, padding: 18, marginBottom: 20,
    borderWidth: 1, borderColor: Colors.active + '40', alignItems: 'center',
  },
  balanceLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  balanceValue: { fontSize: 36, fontWeight: '800', color: Colors.active },

  sectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 10 },

  txnCard: {
    backgroundColor: Colors.card, borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  txnDate: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  txnType: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  txnDesc: { fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  txnAmount: { fontSize: 16, fontWeight: '700', alignSelf: 'flex-end' },

  usageCard: {
    backgroundColor: Colors.card, borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 3, borderLeftColor: Colors.expired,
  },
  usageTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  usageDate: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  usageReference: { fontSize: 12, color: Colors.textSecondary, marginBottom: 8 },
  usageRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  usageLabel: { fontSize: 13, color: Colors.textSecondary },
  usageValue: { fontSize: 13, fontWeight: '700' },

  emptyBlock: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { fontSize: 14, color: Colors.textMuted, marginTop: 8 },
});

export default ReferralManagementScreen;
