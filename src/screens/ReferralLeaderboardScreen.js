import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../theme/colors';
import apiClient from '../api/client';

const ReferralLeaderboardScreen = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => { fetchLeaderboard(); }, []));

  const fetchLeaderboard = async () => {
    try {
      const res = await apiClient.get('/referrals/leaderboard');
      setLeaderboard(res.data);
    } catch (err) {
      console.log('Leaderboard error:', err.message);
    }
    setLoading(false);
  };

  const getMedalIcon = (index) => {
    if (index === 0) return { name: 'trophy', color: '#FFD700' };
    if (index === 1) return { name: 'medal', color: '#C0C0C0' };
    if (index === 2) return { name: 'medal', color: '#CD7F32' };
    return { name: 'star', color: Colors.textMuted };
  };

  const renderItem = ({ item, index }) => {
    const medal = getMedalIcon(index);
    return (
      <View style={[styles.card, index < 3 && styles.topCard]}>
        <View style={styles.rankWrap}>
          <Text style={[styles.rank, index < 3 && { color: medal.color }]}>
            {index + 1}
          </Text>
        </View>
        <View style={styles.avatarWrap}>
          {item.photo ? (
            <Image source={{ uri: item.photo }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{item.name?.charAt(0)?.toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.code}>Code: {item.referralCode}</Text>
        </View>
        <View style={styles.countWrap}>
          <Ionicons name={medal.name} size={18} color={medal.color} />
          <Text style={[styles.count, { color: medal.color }]}>
            {item.referralCount}
          </Text>
        </View>
      </View>
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
        <Ionicons name="trophy" size={28} color="#FFD700" />
        <Text style={styles.title}>Referral Leaderboard</Text>
      </View>
      <Text style={styles.subtitle}>Members who brought the most friends</Text>

      <FlatList
        data={leaderboard}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No referrals yet</Text>
            <Text style={styles.emptyHint}>Members can use their referral codes to invite friends</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingTop: 20,
  },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, paddingHorizontal: 20, marginTop: 4, marginBottom: 20 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border,
  },
  topCard: { borderColor: Colors.primary + '30' },
  rankWrap: { width: 30 },
  rank: { fontSize: 18, fontWeight: '800', color: Colors.textMuted },
  avatarWrap: { marginRight: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryGlow,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: Colors.text },
  code: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  countWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  count: { fontSize: 20, fontWeight: '800' },
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: '600', color: Colors.textSecondary, marginTop: 12 },
  emptyHint: { fontSize: 14, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
});

export default ReferralLeaderboardScreen;
