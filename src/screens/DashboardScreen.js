import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Colors from '../theme/colors';
import apiClient from '../api/client';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
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
          <Ionicons name="notifications-outline" size={24} color={Colors.text} />
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
        >
          <Ionicons name="qr-code" size={18} color={Colors.background} />
          <Text style={styles.scanBtnText}>Scan</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
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
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  greeting: { fontSize: 14, color: Colors.textSecondary },
  ownerName: { fontSize: 26, fontWeight: '700', color: Colors.text, marginTop: 2 },
  gymName: { fontSize: 14, color: Colors.primary, fontWeight: '500', marginTop: 2 },
  notifBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.card,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
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
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 6,
  },
  scanBtnText: { fontSize: 14, fontWeight: '600', color: Colors.background },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
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
