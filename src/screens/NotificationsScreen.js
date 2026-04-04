import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../theme/colors';
import apiClient from '../api/client';

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);

  useFocusEffect(useCallback(() => { fetchNotifications(); }, []));

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.log('Notifications error:', err.message);
    }
    setLoading(false);
  };

  const generateNotifications = async () => {
    setGenerating(true);
    try {
      const res = await apiClient.post('/notifications/generate');
      await fetchNotifications();
    } catch (err) {
      console.log('Generate error:', err.message);
    }
    setGenerating(false);
  };

  const markRead = async (id) => {
    try {
      await apiClient.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, read: true } : n)
      );
    } catch (err) {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'expiry_reminder': return { name: 'alarm', color: Colors.expiringSoon };
      case 'expiry_recovery': return { name: 'refresh', color: Colors.expired };
      case 'payment_due': return { name: 'wallet', color: Colors.accent };
      case 'referral': return { name: 'gift', color: Colors.secondary };
      default: return { name: 'notifications', color: Colors.primary };
    }
  };

  const renderItem = ({ item }) => {
    const icon = getNotifIcon(item.type);
    return (
      <TouchableOpacity
        style={[styles.card, !item.read && styles.cardUnread]}
        onPress={() => markRead(item._id)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, { backgroundColor: icon.color + '18' }]}>
          <Ionicons name={icon.name} size={20} color={icon.color} />
        </View>
        <View style={styles.notifContent}>
          <Text style={styles.message} numberOfLines={3}>{item.message}</Text>
          <Text style={styles.time}>
            {new Date(item.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>{notifications.length} notification(s)</Text>
        </View>
        <TouchableOpacity
          style={[styles.genBtn, generating && { opacity: 0.7 }]}
          onPress={generateNotifications}
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
        data={notifications}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No notifications</Text>
            <Text style={styles.emptyHint}>
              Tap "Generate" to check for expiry reminders
            </Text>
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
  title: { fontSize: 26, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  genBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
  },
  genBtnText: { fontSize: 13, fontWeight: '600', color: Colors.background },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
  },
  cardUnread: { borderColor: Colors.primary + '40', backgroundColor: Colors.primaryGlow },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  notifContent: { flex: 1 },
  message: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  time: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginLeft: 8 },
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: '600', color: Colors.textSecondary, marginTop: 12 },
  emptyHint: { fontSize: 14, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
});

export default NotificationsScreen;
