import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Colors from '../theme/colors';
import apiClient from '../api/client';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { useCachedQuery } from '../hooks/useCachedQuery';

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const prevCount = useRef(0);
  const didInitShake = useRef(false);
  const [stats, setStats] = useState({
    totalMembers: 0, activeMembers: 0, expiringSoon: 0,
    expiredMembers: 0, revenueThisMonth: 0, pendingDues: 0, todayAttendance: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await apiClient.get('/dashboard');
      setStats(res.data);
    } catch (err) {
      console.log('Dashboard error:', err.message);
    }
  };

  useFocusEffect(useCallback(() => { fetchDashboard(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  const fetchMembers = useCallback(async () => {
    const res = await apiClient.get('/members');
    return res.data || [];
  }, []);

  const membersQuery = useCachedQuery('members', fetchMembers);
  const members = Array.isArray(membersQuery.data) ? membersQuery.data : [];

  const notificationCount = useMemo(() => {
    const now = new Date();
    return members.filter((m) => {
      if (!m?.expiryDate) return false;
      const expiry = new Date(m.expiryDate);
      const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
      return !Number.isNaN(daysLeft) && daysLeft <= 7;
    }).length;
  }, [members]);

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  useEffect(() => {
    if (!didInitShake.current) {
      didInitShake.current = true;
      if (notificationCount > 0) triggerShake();
      prevCount.current = notificationCount;
      return;
    }

    if (notificationCount > prevCount.current) {
      triggerShake();
    }
    prevCount.current = notificationCount;
  }, [notificationCount, triggerShake]);

  const quickActions = [
    { icon: 'person-add', label: 'Add Member', navigate: () => navigation.navigate('Members', { screen: 'AddMember', initial: false }), color: Colors.primary },
    { icon: 'qr-code', label: 'Scan QR', navigate: () => navigation.navigate('Scanner'), color: Colors.secondary },
    { icon: 'ribbon', label: 'Plans', navigate: () => navigation.navigate('Plans'), color: Colors.accent },
    { icon: 'images', label: 'Transforms', navigate: () => navigation.navigate('Transformations'), color: Colors.info },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.ownerName}>{user?.name || 'Owner'}</Text>
          <Text style={styles.gymName}>{user?.gymName || 'Your Gym'}</Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Animated.View
            style={{
              transform: [
                {
                  rotate: shakeAnim.interpolate({
                    inputRange: [-1, 1],
                    outputRange: ['-10deg', '10deg'],
                  }),
                },
              ],
            }}
          >
            <Ionicons name="notifications-outline" size={24} color={Colors.text} />
          </Animated.View>
          {notificationCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {notificationCount > 99 ? '99+' : notificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.statsGrid}>
        <StatCard icon="people" label="Total Members" value={stats.totalMembers} color={Colors.primary}
          onPress={() => navigation.navigate('Members', { screen: 'MembersList', initial: false, params: { filter: 'all' } })} />
        <StatCard icon="checkmark-circle" label="Active" value={stats.activeMembers} color={Colors.active}
          onPress={() => navigation.navigate('Members', { screen: 'MembersList', initial: false, params: { filter: 'active' } })} />
        <StatCard icon="alert-circle" label="Expiring Soon" value={stats.expiringSoon} color={Colors.expiringSoon}
          onPress={() => navigation.navigate('Members', { screen: 'MembersList', initial: false, params: { filter: 'expiring' } })} />
        <StatCard icon="close-circle" label="Expired" value={stats.expiredMembers} color={Colors.expired}
          onPress={() => navigation.navigate('Members', { screen: 'MembersList', initial: false, params: { filter: 'expired' } })} />
        <StatCard icon="cash" label="Revenue (Month)" value={`₹${stats.revenueThisMonth}`} color={Colors.secondary}
          onPress={() => navigation.navigate('RevenueAnalysis')} />
        <StatCard icon="wallet" label="Pending Dues" value={stats.pendingDues} color={Colors.accent}
          onPress={() => navigation.navigate('Members', { screen: 'MembersList', initial: false, params: { filter: 'dues' } })} />
      </View>

      {/* Today's Attendance */}
      <View style={styles.attendanceCard}>
        <View style={styles.attendanceLeft}>
          <Ionicons name="footsteps" size={28} color={Colors.primary} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.attendanceLabel}>Today's Check-ins</Text>
            <Text style={styles.attendanceValue}>{stats.todayAttendance}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => navigation.navigate('Scanner')}
          accessibilityLabel="Scan QR code"
          accessibilityRole="button"
        >
          <Ionicons name="qr-code" size={18} color={Colors.background} />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <TouchableOpacity
        style={styles.enquiryHighlightCard}
        onPress={() => navigation.navigate('Enquiries')}
        accessibilityRole="button"
        accessibilityLabel="Open enquiries management"
      >
        <View style={styles.enquiryHighlightLeft}>
          <View style={styles.enquiryHighlightIcon}>
            <Ionicons name="chatbubbles" size={22} color={Colors.background} />
          </View>
          <View>
            <Text style={styles.enquiryHighlightTitle}>Enquiries</Text>
            <Text style={styles.enquiryHighlightSubtitle}>Manage leads and follow-ups</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
      </TouchableOpacity>
      <View style={styles.actionsGrid}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.actionCard}
            onPress={action.navigate}
          >
            <View style={[styles.actionIcon, { backgroundColor: action.color + '18' }]}>
              <Ionicons name={action.icon} size={24} color={action.color} />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  greeting: { fontSize: 14, color: Colors.textSecondary },
  ownerName: { fontSize: 26, fontWeight: '700', color: Colors.text, marginTop: 2 },
  gymName: { fontSize: 14, color: Colors.primary, fontWeight: '500', marginTop: 2 },
  notifBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.card,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  attendanceCard: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 18,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24, borderWidth: 1, borderColor: Colors.border,
  },
  attendanceLeft: { flexDirection: 'row', alignItems: 'center' },
  attendanceLabel: { fontSize: 13, color: Colors.textSecondary },
  attendanceValue: { fontSize: 24, fontWeight: '700', color: Colors.text },
  scanBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 92,
    minHeight: 40,
  },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  enquiryHighlightCard: {
    backgroundColor: Colors.primaryGlow,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '55',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  enquiryHighlightLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  enquiryHighlightIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enquiryHighlightTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  enquiryHighlightSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  actionCard: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 16,
    width: '48%', marginBottom: 12, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  actionIcon: {
    width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  actionLabel: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
});

export default DashboardScreen;
