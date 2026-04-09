import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../theme/colors';
import apiClient from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useCachedQuery } from '../hooks/useCachedQuery';

const formatExpiryDate = (dateLike) => {
  const d = dateLike ? new Date(dateLike) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getNotificationStyle = (daysLeft) => {
  const d = Number(daysLeft);
  if (d < 0) {
    return {
      bg: 'rgba(255, 40, 40, 0.22)',
      border: 'rgba(255, 80, 80, 0.8)',
      shadow: '#ff4d4d',
      iconBg: 'rgba(255, 80, 80, 0.25)',
      iconBorder: 'rgba(255, 80, 80, 0.55)',
      dot: '#ff4d4d',
    };
  }
  if (d <= 2) {
    return {
      bg: 'rgba(255, 60, 60, 0.18)',
      border: 'rgba(255, 80, 80, 0.8)',
      shadow: '#ff4d4d',
      iconBg: 'rgba(255, 80, 80, 0.25)',
      iconBorder: 'rgba(255, 80, 80, 0.55)',
      dot: '#ff4d4d',
    };
  }
  if (d <= 4) {
    return {
      bg: 'rgba(255, 180, 0, 0.16)',
      border: 'rgba(255, 200, 0, 0.7)',
      shadow: '#ffc107',
      iconBg: 'rgba(255, 200, 0, 0.22)',
      iconBorder: 'rgba(255, 200, 0, 0.5)',
      dot: '#ffc107',
    };
  }
  return {
    bg: 'rgba(0, 220, 140, 0.16)',
    border: 'rgba(0, 255, 160, 0.7)',
    shadow: '#00e676',
    iconBg: 'rgba(0, 255, 160, 0.20)',
    iconBorder: 'rgba(0, 255, 160, 0.45)',
    dot: '#00e676',
  };
};

const formatRelativeTime = (dateLike) => {
  const d = dateLike ? new Date(dateLike) : null;
  if (!d || Number.isNaN(d.getTime())) return '';

  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHr = Math.floor(diffMs / (1000 * 60 * 60));

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
  if (diffHr < 6 && d >= startOfToday) return `${diffHr} hr${diffHr === 1 ? '' : 's'} ago`;

  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (d >= startOfToday) return `Today, ${time}`;
  if (d >= startOfYesterday) return `Yesterday, ${time}`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const buildFeed = (notifications) => {
  const urgent = [];
  const upcoming = [];

  notifications.forEach((n) => {
    const daysLeft = Number(n?.daysLeft);
    if (daysLeft < 0 || daysLeft <= 2) urgent.push(n);
    else upcoming.push(n);
  });

  const feed = [];
  if (urgent.length) feed.push({ _id: '__hdr_urgent__', kind: 'header', title: 'Urgent' }, ...urgent.map((n) => ({ ...n, kind: 'item' })));
  if (upcoming.length) feed.push({ _id: '__hdr_upcoming__', kind: 'header', title: 'Upcoming' }, ...upcoming.map((n) => ({ ...n, kind: 'item' })));
  return feed;
};

const getExpiryNotifications = (members, readIds) => {
  const now = new Date();

  return members
    .map((member) => {
      if (!member?.expiryDate) return null;

      const expiry = new Date(member.expiryDate);
      const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

      if (Number.isNaN(daysLeft)) return null;

      if (daysLeft < 0) {
        const id = `${member._id || member.mobile || member.name}-expired`;
        return {
          _id: id,
          type: 'expired',
          message: `${member.name} membership expired`,
          member,
          daysLeft,
          createdAt: member.expiryDate,
          read: readIds.has(id),
        };
      }

      if (daysLeft <= 7) {
        const id = `${member._id || member.mobile || member.name}-expiring`;
        return {
          _id: id,
          type: 'expiring',
          message: `${member.name} expires in ${daysLeft} day(s)`,
          member,
          daysLeft,
          createdAt: member.expiryDate,
          read: readIds.has(id),
        };
      }

      return null;
    })
    .filter(Boolean)
    .sort((a, b) => a.daysLeft - b.daysLeft);
};

const NotificationsScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [readIds, setReadIds] = useState(() => new Set());
  const queryClient = useQueryClient();

  const fetchMembers = useCallback(async () => {
    const res = await apiClient.get('/members');
    return res.data || [];
  }, []);

  const membersQuery = useCachedQuery('members', fetchMembers, { staleMs: 30_000 });
  const members = Array.isArray(membersQuery.data) ? membersQuery.data : [];

  const notifications = getExpiryNotifications(members, readIds);
  const feed = buildFeed(notifications);

  const onRefresh = async () => {
    setRefreshing(true);
    await membersQuery.refetch();
    setRefreshing(false);
  };

  const getUrgencyUi = (daysLeft) => {
    const d = Number(daysLeft);
    if (d < 0) {
      return {
        icon: 'close-circle-outline',
        color: Colors.expired,
        tintBg: Colors.expiredBg || (Colors.expired + '14'),
      };
    }
    if (d <= 2) {
      return {
        icon: 'time-outline',
        color: Colors.expired,
        tintBg: Colors.expiredBg || (Colors.expired + '14'),
      };
    }
    if (d <= 4) {
      return {
        icon: 'time-outline',
        color: Colors.expiringSoon,
        tintBg: Colors.expiringSoonBg || (Colors.expiringSoon + '14'),
      };
    }
    return {
      icon: 'time-outline',
      color: Colors.active,
      tintBg: Colors.activeBg || (Colors.active + '14'),
    };
  };

  const HeaderRow = React.useCallback(({ title }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  ), []);

  const renderItem = ({ item }) => {
    if (item.kind === 'header') {
      return <HeaderRow title={item.title} />;
    }

    const ui = getUrgencyUi(item.daysLeft);
    const tone = getNotificationStyle(item.daysLeft);
    const timeLabel = formatRelativeTime(item.createdAt);
    const name = item.member?.name || 'Member';
    const daysLeft = Number(item.daysLeft);
    const abs = Math.abs(daysLeft);
    const subtitle = daysLeft < 0
      ? `Expired ${abs} day${abs === 1 ? '' : 's'} ago`
      : `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
    const expDate = formatExpiryDate(item.member?.expiryDate || item.createdAt);
    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: tone.bg,
            borderColor: tone.border,
            borderWidth: 1.2,
            shadowColor: tone.shadow,
            shadowOpacity: item.read ? 0.35 : 0.6,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 0 },
            elevation: 5,
          },
          !item.read && styles.cardUnread,
        ]}
        onPress={() => {
          setReadIds((prev) => {
            const next = new Set(prev);
            next.add(item._id);
            return next;
          });
          if (item.member?._id) {
            navigation.navigate('MemberProfile', { memberId: item.member._id });
          }
        }}
        activeOpacity={0.85}
      >
        <View style={[styles.iconWrap, { backgroundColor: tone.iconBg, borderColor: tone.iconBorder }]}>
          <Ionicons name={ui.icon} size={20} color={ui.color} />
        </View>
        <View style={styles.notifContent}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{name}</Text>
            {!!timeLabel && <Text style={styles.timeRight} numberOfLines={1}>{timeLabel}</Text>}
          </View>
          <Text style={styles.message} numberOfLines={2}>{subtitle}</Text>
          {!!expDate && (
            <Text style={styles.meta} numberOfLines={1}>Exp: {expDate}</Text>
          )}
        </View>
        <View style={styles.rightRail}>
          {!item.read && <View style={[styles.unreadDot, { backgroundColor: tone.dot }]} />}
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  useEffect(() => {
    console.log('🔔 Notifications generated:', notifications.length);
  }, [notifications.length]);

  if (membersQuery.isLoading && members.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => {
              console.log('[Notifications] nav state:', navigation?.getState?.());
              if (navigation?.canGoBack?.() && navigation.canGoBack()) {
                navigation.goBack();
                return;
              }

              // Dashboard is a bottom-tab route in this app (Tab.Screen name="Dashboard")
              const tabNav = navigation?.getParent?.();
              if (tabNav?.navigate) {
                tabNav.navigate('Dashboard');
                return;
              }

              // Final fallback: try the stack's dashboard home screen
              navigation.navigate('DashboardHome');
            }}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>{notifications.length} notification(s)</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.genBtn, generating && { opacity: 0.7 }]}
          onPress={async () => {
            try {
              setGenerating(true);
              await membersQuery.refetch();
              queryClient.invalidateQueries({ queryKey: ['members'], refetchType: 'none' });
            } finally {
              setGenerating(false);
            }
          }}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color={Colors.background} size="small" />
          ) : (
            <>
              <Ionicons name="flash" size={16} color={Colors.background} />
              <Text style={styles.genBtnText}>Generate</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={feed}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="checkmark-done-outline" size={44} color={Colors.active} />
            </View>
            <Text style={styles.emptyText}>All good 🎉</Text>
            <Text style={styles.emptyHint}>No memberships expiring soon</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  backBtn: { marginRight: 10, padding: 6, borderRadius: 8 },
  title: { fontSize: 26, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  genBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
  },
  genBtnText: { fontSize: 13, fontWeight: '600', color: Colors.background },
  list: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 4 },
  sectionHeader: { paddingTop: 10, paddingBottom: 8 },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  cardUnread: { backgroundColor: Colors.surface || Colors.card },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  notifContent: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, flex: 1 },
  timeRight: { fontSize: 12, color: Colors.textMuted, marginLeft: 10 },
  message: { fontSize: 13.5, color: Colors.textSecondary, lineHeight: 19, marginTop: 4 },
  meta: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  rightRail: { alignItems: 'flex-end', justifyContent: 'center', marginLeft: 10, gap: 10 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  empty: { alignItems: 'center', marginTop: 70, paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: (Colors.activeBg || Colors.primaryGlow || Colors.card),
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyText: { fontSize: 20, fontWeight: '800', color: Colors.text, marginTop: 14 },
  emptyHint: { fontSize: 14, color: Colors.textMuted, marginTop: 6, textAlign: 'center' },
});

export default NotificationsScreen;
