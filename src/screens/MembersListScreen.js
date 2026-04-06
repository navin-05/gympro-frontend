import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Alert, Animated, Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../theme/colors';
import apiClient from '../api/client';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

const getStatusInfo = (member) => {
  if (!member.expiryDate) return { label: 'No Plan', color: Colors.textMuted, bg: Colors.card };
  const now = new Date();
  const expiry = new Date(member.expiryDate);
  const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { label: 'Expired', color: Colors.expired, bg: Colors.expiredBg };
  if (daysLeft <= 7) return { label: `${daysLeft}d left`, color: Colors.expiringSoon, bg: Colors.expiringSoonBg };
  return { label: 'Active', color: Colors.active, bg: Colors.activeBg };
};

const SwipeableMemberRow = ({ member, onPress, onDelete }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const isSwiped = useRef(false);

  const resetSwipe = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    isSwiped.current = false;
  };

  const status = getStatusInfo(member);

  return (
    <View style={rowStyles.wrapper}>
      <View style={rowStyles.deleteBackground}>
        <TouchableOpacity
          style={rowStyles.deleteBtn}
          onPress={() => {
            resetSwipe();
            onDelete(member);
          }}
        >
          <Ionicons name="trash" size={20} color="#fff" />
          <Text style={rowStyles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={[rowStyles.card, { transform: [{ translateX }] }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onPress}
          onLongPress={() => {
            Alert.alert(
              'Delete Member',
              `Remove ${member.name} from your gym?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => onDelete(member) },
              ]
            );
          }}
          style={rowStyles.cardInner}
        >
          <View style={rowStyles.avatarWrap}>
            {member.photo ? (
              <Image source={{ uri: member.photo }} style={rowStyles.avatar} />
            ) : (
              <View style={[rowStyles.avatarPlaceholder, { borderColor: status.color + '40' }]}>
                <Text style={[rowStyles.avatarText, { color: status.color }]}>
                  {member.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>

          <View style={rowStyles.info}>
            <Text style={rowStyles.name} numberOfLines={1}>{member.name}</Text>
            <Text style={rowStyles.meta} numberOfLines={1}>
              {member.planName || 'No Plan'} • {member.mobile}
            </Text>
            <View style={rowStyles.datesRow}>
              <Text style={rowStyles.dateLabel}>
                <Ionicons name="calendar-outline" size={11} color={Colors.textMuted} /> DOJ: {formatDate(member.startDate)}
              </Text>
              <Text style={rowStyles.dateLabel}>
                <Ionicons name="time-outline" size={11} color={Colors.textMuted} /> Exp: {formatDate(member.expiryDate)}
              </Text>
            </View>
          </View>

          <View style={rowStyles.right}>
            <View style={[rowStyles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[rowStyles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
            {member.dueAmount > 0 ? (
              <Text style={rowStyles.dueText}>₹{member.dueAmount} due</Text>
            ) : (
              <Text style={rowStyles.paidText}>Paid ✓</Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const MemoizedMemberRow = React.memo(
  SwipeableMemberRow,
  (prevProps, nextProps) => (
    prevProps.member._id === nextProps.member._id &&
    prevProps.member.name === nextProps.member.name &&
    prevProps.member.mobile === nextProps.member.mobile &&
    prevProps.member.photo === nextProps.member.photo &&
    prevProps.member.planName === nextProps.member.planName &&
    prevProps.member.startDate === nextProps.member.startDate &&
    prevProps.member.expiryDate === nextProps.member.expiryDate &&
    prevProps.member.dueAmount === nextProps.member.dueAmount
  )
);

const rowStyles = StyleSheet.create({
  wrapper: { marginBottom: 10, position: 'relative' },
  deleteBackground: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 80,
    backgroundColor: Colors.expired, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  deleteBtn: { alignItems: 'center' },
  deleteBtnText: { fontSize: 11, color: '#fff', fontWeight: '600', marginTop: 2 },
  card: {
    backgroundColor: Colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardInner: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
  },
  avatarWrap: { marginRight: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryGlow,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1.5,
  },
  avatarText: { fontSize: 20, fontWeight: '700' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  meta: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  datesRow: { flexDirection: 'row', gap: 12 },
  dateLabel: { fontSize: 11, color: Colors.textMuted },
  right: { alignItems: 'flex-end', marginLeft: 8 },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  dueText: { fontSize: 11, color: Colors.expired, fontWeight: '600', marginTop: 6 },
  paidText: { fontSize: 11, color: Colors.active, fontWeight: '600', marginTop: 6 },
});

const MembersListScreen = ({ navigation, route }) => {
  const [allMembers, setAllMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingFilter, setLoadingFilter] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState(null);
  const hasFetchedRef = useRef(false);
  const filterDelayRef = useRef(null);
  const listOpacity = useRef(new Animated.Value(1)).current;

  const applyFilter = useCallback((searchText, filterKey, source) => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(now.getDate() + 7);
    const normalizedSearch = String(searchText || '').trim().toLowerCase();

    return source.filter((member) => {
      const name = member.name?.toLowerCase() || '';
      const mobile = member.mobile?.toLowerCase() || '';
      const matchesSearch = !normalizedSearch || name.includes(normalizedSearch) || mobile.includes(normalizedSearch);
      if (!matchesSearch) return false;

      const expiryDate = member.expiryDate ? new Date(member.expiryDate) : null;
      const dueAmount = Number(member.dueAmount || 0);

      if (filterKey === 'dues') return dueAmount > 0;
      if (!expiryDate || filterKey === 'all') return true;
      if (filterKey === 'active') return expiryDate > sevenDaysFromNow;
      if (filterKey === 'expiring') return expiryDate >= now && expiryDate <= sevenDaysFromNow;
      if (filterKey === 'expired') return expiryDate < now;
      return true;
    });
  }, []);

  const fetchMembersOnce = useCallback(async (initialFilter) => {
    try {
      const res = await apiClient.get('/members');
      const members = res.data || [];
      setAllMembers(members);
      setFilteredMembers(applyFilter('', initialFilter, members));
      hasFetchedRef.current = true;
    } catch (err) {
      console.log('[MembersList] Error:', err.message);
    } finally {
      setLoading(false);
      setLoadingFilter(false);
    }
  }, [applyFilter]);

  useFocusEffect(useCallback(() => {
    const filterParam = route.params?.filter || 'all';
    setActiveFilter(filterParam);
    if (!hasFetchedRef.current) {
      setLoading(true);
      fetchMembersOnce(filterParam);
    }
  }, [route.params?.filter, fetchMembersOnce]));

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (loading || allMembers.length === 0) return;
    if (filterDelayRef.current) clearTimeout(filterDelayRef.current);

    setLoadingFilter(true);
    Animated.timing(listOpacity, {
      toValue: 0.6,
      duration: 100,
      useNativeDriver: true,
    }).start();

    filterDelayRef.current = setTimeout(() => {
      setFilteredMembers(applyFilter(debouncedSearch, activeFilter, allMembers));
      Animated.timing(listOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start(() => setLoadingFilter(false));
    }, 150);

    return () => {
      if (filterDelayRef.current) clearTimeout(filterDelayRef.current);
    };
  }, [debouncedSearch, activeFilter, allMembers, applyFilter, loading, listOpacity]);

  useEffect(() => () => {
    if (filterDelayRef.current) clearTimeout(filterDelayRef.current);
  }, []);

  const onSearch = (text) => {
    setSearch(text);
  };

  const onFilter = (filter) => {
    setActiveFilter(filter);
  };

  const handleDelete = useCallback((member) => {
    Alert.alert(
      'Delete Member',
      `Are you sure you want to remove ${member.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/members/${member._id}`);
              const nextAllMembers = allMembers.filter((m) => m._id !== member._id);
              setAllMembers(nextAllMembers);
              setFilteredMembers(applyFilter(debouncedSearch, activeFilter, nextAllMembers));
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to delete');
            }
          },
        },
      ]
    );
  }, [allMembers, applyFilter, debouncedSearch, activeFilter]);

  const sortedMembers = React.useMemo(() => {
    if (!sortBy) return filteredMembers;
    const sorted = [...filteredMembers];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'expiry_asc':
          return new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0);
        case 'expiry_desc':
          return new Date(b.expiryDate || 0) - new Date(a.expiryDate || 0);
        case 'doj_asc':
          return new Date(a.startDate || 0) - new Date(b.startDate || 0);
        case 'doj_desc':
          return new Date(b.startDate || 0) - new Date(a.startDate || 0);
        default:
          return 0;
      }
    });
    return sorted;
  }, [filteredMembers, sortBy]);

  const renderItem = useCallback(({ item }) => (
    <MemoizedMemberRow
      member={item}
      onPress={() => navigation.navigate('MemberProfile', { memberId: item._id })}
      onDelete={handleDelete}
    />
  ), [navigation, handleDelete]);

  const toggleSort = (field) => {
    if (sortBy === `${field}_asc`) setSortBy(`${field}_desc`);
    else if (sortBy === `${field}_desc`) setSortBy(null);
    else setSortBy(`${field}_asc`);
  };

  const getSortIcon = (field) => {
    if (sortBy === `${field}_asc`) return 'arrow-up';
    if (sortBy === `${field}_desc`) return 'arrow-down';
    return 'swap-vertical-outline';
  };

  const filters = [
    { key: 'all', label: 'All', icon: 'people-outline' },
    { key: 'active', label: 'Active', icon: 'checkmark-circle-outline' },
    { key: 'expiring', label: 'Expiring', icon: 'alert-circle-outline' },
    { key: 'expired', label: 'Expired', icon: 'close-circle-outline' },
    { key: 'dues', label: 'Dues', icon: 'wallet-outline' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Members</Text>
          <Text style={styles.count}>{sortedMembers.length} member(s)</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={20} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone..."
          placeholderTextColor={Colors.placeholder}
          value={search}
          onChangeText={onSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => onSearch('')}>
            <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filters}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, activeFilter === f.key && styles.filterActive]}
            onPress={() => onFilter(f.key)}
          >
            <Ionicons
              name={f.icon}
              size={14}
              color={activeFilter === f.key ? Colors.primary : Colors.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <TouchableOpacity style={styles.sortBtn} onPress={() => toggleSort('expiry')}>
          <Ionicons name={getSortIcon('expiry')} size={14} color={sortBy?.startsWith('expiry') ? Colors.primary : Colors.textMuted} />
          <Text style={[styles.sortBtnText, sortBy?.startsWith('expiry') && { color: Colors.primary }]}>Expiry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sortBtn} onPress={() => toggleSort('doj')}>
          <Ionicons name={getSortIcon('doj')} size={14} color={sortBy?.startsWith('doj') ? Colors.primary : Colors.textMuted} />
          <Text style={[styles.sortBtnText, sortBy?.startsWith('doj') && { color: Colors.primary }]}>DOJ</Text>
        </TouchableOpacity>
        {sortBy && (
          <TouchableOpacity onPress={() => setSortBy(null)}>
            <Text style={styles.sortClear}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <Animated.View style={{ flex: 1, opacity: loadingFilter ? 0.6 : listOpacity }}>
          <FlatList
            data={sortedMembers}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            windowSize={5}
            removeClippedSubviews={true}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={56} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No members found</Text>
                <Text style={styles.emptyHint}>
                  {search ? 'Try a different search' : 'Add your first gym member'}
                </Text>
                {!search && (
                  <TouchableOpacity
                    style={styles.emptyBtn}
                    onPress={() => navigation.navigate('AddMember')}
                  >
                    <Ionicons name="person-add" size={16} color={Colors.background} />
                    <Text style={styles.emptyBtnText}>Add First Member</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        </Animated.View>
      )}

      {loadingFilter && !loading && (
        <View style={styles.filterLoaderOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddMember')}
        activeOpacity={0.8}
      >
        <Ionicons name="person-add" size={24} color={Colors.background} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '700', color: Colors.text },
  count: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg,
    borderRadius: 12, paddingHorizontal: 14, marginHorizontal: 20, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.inputBorder, height: 46,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text, marginLeft: 8 },
  filters: {
    flexDirection: 'row', paddingHorizontal: 20, marginBottom: 8, gap: 6,
    flexWrap: 'wrap',
  },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  filterActive: { backgroundColor: Colors.primaryGlow, borderColor: Colors.primary },
  filterText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: Colors.primary },
  sortRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    marginBottom: 12, gap: 8,
  },
  sortLabel: { fontSize: 12, color: Colors.textMuted, marginRight: 4 },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  sortBtnText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  sortClear: { fontSize: 12, color: Colors.expired, fontWeight: '500', marginLeft: 4 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyText: {
    fontSize: 18, fontWeight: '600', color: Colors.textSecondary,
    marginTop: 16, marginBottom: 6,
  },
  emptyHint: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginBottom: 20 },
  emptyBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: Colors.background },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    elevation: 8,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8,
  },
  filterLoaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MembersListScreen;
