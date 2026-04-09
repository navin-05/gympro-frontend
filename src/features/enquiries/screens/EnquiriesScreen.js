import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Colors from '../../../theme/colors';
import { useTopPadding } from '../../../utils/useTopPadding';
import EnquiryCard from '../components/EnquiryCard';
import AddEnquiryModal from '../components/AddEnquiryModal';
import { DEFAULT_TAG_OPTIONS, ENQUIRY_STATUS, STATUS_LABELS } from '../constants';
import { createEnquiry, getEnquiries } from '../api';
import { buildEnquiryPayload, isFollowUpDue, openDialer, openWhatsApp } from '../utils';

const EnquiriesScreen = ({ navigation }) => {
  const topPadding = useTopPadding();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const bellAnim = useRef(new Animated.Value(0)).current;

  const enquiriesQuery = useQuery({
    queryKey: ['enquiries'],
    queryFn: getEnquiries,
  });

  const enquiries = Array.isArray(enquiriesQuery.data) ? enquiriesQuery.data : [];

  const summary = useMemo(() => {
    const total = enquiries.length;
    const joined = enquiries.filter((e) => e.status === 'joined').length;
    const followUpsToday = enquiries.filter((e) => isFollowUpDue(e)).length;
    const conversionRate = total > 0 ? ((joined / total) * 100).toFixed(1) : '0.0';
    return { total, joined, followUpsToday, conversionRate };
  }, [enquiries]);

  React.useEffect(() => {
    if (summary.followUpsToday > 0) {
      Animated.sequence([
        Animated.timing(bellAnim, { toValue: 1, duration: 90, useNativeDriver: true }),
        Animated.timing(bellAnim, { toValue: -1, duration: 90, useNativeDriver: true }),
        Animated.timing(bellAnim, { toValue: 1, duration: 90, useNativeDriver: true }),
        Animated.timing(bellAnim, { toValue: 0, duration: 90, useNativeDriver: true }),
      ]).start();
    }
  }, [summary.followUpsToday, bellAnim]);

  const filteredEnquiries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enquiries.filter((enquiry) => {
      const matchesSearch = !q
        || enquiry.name?.toLowerCase().includes(q)
        || String(enquiry.phone || '').includes(q);
      const matchesStatus = statusFilter === 'all' || enquiry.status === statusFilter;
      const matchesTag = tagFilter === 'all' || (enquiry.tags || []).includes(tagFilter);
      return matchesSearch && matchesStatus && matchesTag;
    });
  }, [enquiries, search, statusFilter, tagFilter]);

  const handleCall = async (enquiry) => {
    const opened = await openDialer(enquiry.phone);
    if (!opened) {
      Alert.alert('Unable to call', 'Dialer could not be opened on this device.');
    }
  };

  const handleWhatsApp = async (enquiry) => {
    const opened = await openWhatsApp({ phone: enquiry.phone, name: enquiry.name });
    if (!opened) {
      Alert.alert('Unable to open WhatsApp', 'WhatsApp chat could not be opened.');
    }
  };

  const handleCreate = async (form) => {
    try {
      const payload = buildEnquiryPayload(form);
      const created = await createEnquiry(payload);
      queryClient.setQueryData(['enquiries'], (oldData = []) => [created, ...oldData]);
      return true;
    } catch (error) {
      Alert.alert('Create failed', error?.response?.data?.error || error?.message || 'Failed to add enquiry.');
      return false;
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topPadding }]}
        refreshControl={(
          <RefreshControl
            refreshing={enquiriesQuery.isRefetching}
            onRefresh={() => enquiriesQuery.refetch()}
            tintColor={Colors.primary}
          />
        )}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Enquiries</Text>
            <Text style={styles.subtitle}>Lead management</Text>
          </View>
          <TouchableOpacity style={styles.notificationBtn}>
            <Animated.View
              style={{
                transform: [{
                  rotate: bellAnim.interpolate({
                    inputRange: [-1, 1],
                    outputRange: ['-11deg', '11deg'],
                  }),
                }],
              }}
            >
              <Ionicons name="notifications-outline" size={22} color={Colors.text} />
            </Animated.View>
            {summary.followUpsToday > 0 && (
              <View style={styles.dotBadge}>
                <Text style={styles.dotText}>{summary.followUpsToday}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Enquiries</Text>
            <Text style={styles.statValue}>{summary.total}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Joined</Text>
            <Text style={styles.statValue}>{summary.joined}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Conversion</Text>
            <Text style={styles.statValue}>{summary.conversionRate}%</Text>
          </View>
        </View>

        <View style={styles.followCard}>
          <Ionicons name="calendar-clear-outline" size={18} color={Colors.warning} />
          <Text style={styles.followText}>Follow-ups Today: {summary.followUpsToday}</Text>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone"
          placeholderTextColor={Colors.placeholder}
          value={search}
          onChangeText={setSearch}
        />

        <Text style={styles.filterLabel}>Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
            onPress={() => setStatusFilter('all')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'all' && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          {ENQUIRY_STATUS.map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[styles.filterChipText, statusFilter === status && styles.filterChipTextActive]}>
                {STATUS_LABELS[status]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.filterLabel}>Tags</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, tagFilter === 'all' && styles.filterChipActive]}
            onPress={() => setTagFilter('all')}
          >
            <Text style={[styles.filterChipText, tagFilter === 'all' && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          {DEFAULT_TAG_OPTIONS.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[styles.filterChip, tagFilter === tag && styles.filterChipActive]}
              onPress={() => setTagFilter(tag)}
            >
              <Text style={[styles.filterChipText, tagFilter === tag && styles.filterChipTextActive]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ marginTop: 10 }}>
          {filteredEnquiries.map((enquiry) => (
            <EnquiryCard
              key={enquiry.id}
              enquiry={enquiry}
              onCallPress={handleCall}
              onWhatsAppPress={handleWhatsApp}
            />
          ))}
        </View>

        {!enquiriesQuery.isLoading && filteredEnquiries.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No enquiries found</Text>
            <Text style={styles.emptySub}>Try changing filters or add a new enquiry.</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Ionicons name="add" size={26} color={Colors.background} />
      </TouchableOpacity>

      <AddEnquiryModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleCreate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 110 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { color: Colors.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: Colors.textSecondary, marginTop: 1 },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    paddingHorizontal: 4,
  },
  dotText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  statLabel: { color: Colors.textSecondary, fontSize: 11 },
  statValue: { color: Colors.text, fontSize: 18, fontWeight: '700', marginTop: 2 },
  followCard: {
    marginVertical: 10,
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 42,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  followText: { color: Colors.text, fontWeight: '600' },
  searchInput: {
    backgroundColor: Colors.inputBg,
    borderColor: Colors.inputBorder,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 48,
    color: Colors.text,
    paddingHorizontal: 12,
    marginVertical: 10,
  },
  filterLabel: { color: Colors.textSecondary, fontWeight: '600', marginBottom: 8 },
  filterRow: { gap: 8, paddingBottom: 4, marginBottom: 10 },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderWidth: 1,
  },
  filterChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryGlow },
  filterChipText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 12 },
  filterChipTextActive: { color: Colors.primary },
  emptyState: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: { color: Colors.text, fontWeight: '700', fontSize: 16, marginBottom: 4 },
  emptySub: { color: Colors.textSecondary, textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
});

export default EnquiriesScreen;
