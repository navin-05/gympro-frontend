import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Image, Modal, TextInput, FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../theme/colors';
import apiClient from '../api/client';
import StatusBadge from '../components/StatusBadge';

const MemberProfileScreen = ({ route, navigation }) => {
  const memberId = route.params?.memberId || route.params?.id;
  const queryClient = useQueryClient();
  const [attendance, setAttendance] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [renewModal, setRenewModal] = useState(false);
  const [plans, setPlans] = useState([]);
  const [renewForm, setRenewForm] = useState({ plan: '', paidAmount: '' });
  const [renewSaving, setRenewSaving] = useState(false);
  const [selectedRenewPlan, setSelectedRenewPlan] = useState(null);

  const memberQuery = useQuery({
    queryKey: ['member', memberId],
    queryFn: async () => {
      const res = await apiClient.get(`/members/${memberId}`);
      return res.data;
    },
  });

  const member = memberQuery.data;

  useFocusEffect(useCallback(() => {
    memberQuery.refetch();
    fetchAttendance();
    fetchRenewals();
  }, [memberId]));

  const fetchAttendance = async () => {
    try {
      const res = await apiClient.get(`/attendance/${memberId}`);
      setAttendance(res.data);
    } catch (err) {
      console.log('[MemberProfile] Attendance error:', err.message);
    }
  };

  const fetchRenewals = async () => {
    try {
      const res = await apiClient.get(`/members/${memberId}/renewals`);
      setRenewals(res.data || []);
    } catch (err) {
      console.log('[MemberProfile] Renewals error:', err.message);
    }
  };

  const openRenew = async () => {
    try {
      const res = await apiClient.get('/plans');
      setPlans(res.data);
    } catch (err) {}
    setRenewForm({ plan: '', paidAmount: '' });
    setSelectedRenewPlan(null);
    setRenewModal(true);
  };

  const handleRenew = async () => {
    if (!renewForm.plan) {
      Alert.alert('Error', 'Please select a plan');
      return;
    }
    setRenewSaving(true);
    const body = {
      plan: renewForm.plan,
      paidAmount: parseFloat(renewForm.paidAmount) || 0,
    };
    console.log('[MemberProfile] Renewing — POST /members/' + memberId + '/renewals', JSON.stringify(body));
    try {
      const res = await apiClient.post(`/members/${memberId}/renewals`, body);
      console.log('[MemberProfile] Renew success:', JSON.stringify(res.data?.renewal?._id));
      setRenewModal(false);
      if (res.data?.member) {
        queryClient.setQueryData(['member', memberId], res.data.member);
        queryClient.setQueryData(['members'], (old) => {
          const prev = Array.isArray(old) ? old : [];
          return prev.map((m) => (m._id === memberId ? { ...m, ...res.data.member } : m));
        });
      }
      queryClient.invalidateQueries({ queryKey: ['member', memberId] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      fetchRenewals();
      Alert.alert('Success', 'Membership renewed successfully!');
    } catch (err) {
      console.log('[MemberProfile] Renew error:', err.message, err.response?.data);
      Alert.alert('Error', err.response?.data?.error || 'Failed to renew');
    }
    setRenewSaving(false);
  };

  const handleDelete = () => {
    Alert.alert('Delete Member', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/members/${memberId}`);
            queryClient.removeQueries({ queryKey: ['member', memberId] });
            queryClient.setQueryData(['members'], (old) => {
              const prev = Array.isArray(old) ? old : [];
              return prev.filter((m) => m._id !== memberId);
            });
            queryClient.invalidateQueries({ queryKey: ['members'] });
            navigation.navigate('MembersList');
          } catch (err) {
            Alert.alert('Error', 'Failed to delete member');
          }
        },
      },
    ]);
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  if (memberQuery.isLoading || !member) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ─── Header with Edit Button ──────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('MembersList');
            }
          }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Member Profile</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('EditMember', { memberId })}
          style={styles.editBtn}
        >
          <Ionicons name="create-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ─── Avatar & Name ────────────────────────── */}
      <View style={styles.profileSection}>
        {member.photo ? (
          <Image source={{ uri: member.photo }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{member.name?.charAt(0)?.toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.name}>{member.name}</Text>
        <StatusBadge status={member.status} />
      </View>

      {/* ─── Info Card ────────────────────────────── */}
      <View style={styles.infoCard}>
        {[
          { icon: 'call', label: 'Phone', value: member.mobile },
          { icon: 'mail', label: 'Email', value: member.email || 'Not set' },
          { icon: 'ribbon', label: 'Plan', value: member.planName },
          { icon: 'calendar', label: 'Start Date', value: formatDate(member.startDate) },
          { icon: 'alarm', label: 'Expiry Date', value: formatDate(member.expiryDate) },
          { icon: 'cash', label: 'Paid', value: `₹${member.paidAmount}` },
          { icon: 'wallet', label: 'Due', value: `₹${member.dueAmount}`, color: member.dueAmount > 0 ? Colors.expired : Colors.active },
          { icon: 'gift', label: 'Referral Code', value: member.referralCode || 'N/A' },
          { icon: 'people', label: 'Referrals', value: `${member.referralCount || 0} people` },
        ].map((item, i) => (
          <View key={i} style={[styles.infoRow, i === 8 && { borderBottomWidth: 0 }]}>
            <View style={styles.infoLeft}>
              <Ionicons name={item.icon} size={18} color={Colors.textMuted} />
              <Text style={styles.infoLabel}>{item.label}</Text>
            </View>
            <Text style={[styles.infoValue, item.color && { color: item.color }]}>{item.value}</Text>
          </View>
        ))}
      </View>

      {/* ─── Renewal History Section ───────────────── */}
      <View style={styles.renewalSection}>
        <View style={styles.renewalHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="refresh-circle" size={22} color={Colors.secondary} />
            <Text style={styles.sectionTitle}>Renewal History</Text>
          </View>
          <Text style={styles.renewalCount}>{renewals.length} record(s)</Text>
        </View>

        {renewals.length === 0 ? (
          <View style={styles.noRenewals}>
            <Ionicons name="document-text-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.noRenewalsText}>No renewal history</Text>
          </View>
        ) : (
          renewals.map((r, i) => (
            <View key={r._id || i} style={styles.renewalCard}>
              <View style={styles.renewalRow}>
                <View style={styles.renewalDot} />
                <Text style={styles.renewalDate}>{formatDate(r.renewalDate)}</Text>
              </View>
              <View style={styles.renewalDetails}>
                <View style={styles.renewalDetailRow}>
                  <Text style={styles.renewalLabel}>Plan</Text>
                  <Text style={styles.renewalValue}>{r.planName}</Text>
                </View>
                <View style={styles.renewalDetailRow}>
                  <Text style={styles.renewalLabel}>Duration</Text>
                  <Text style={styles.renewalValue}>{r.duration} days</Text>
                </View>
                <View style={styles.renewalDetailRow}>
                  <Text style={styles.renewalLabel}>Amount</Text>
                  <Text style={[styles.renewalValue, { color: Colors.primary }]}>₹{r.amount}</Text>
                </View>
                <View style={styles.renewalDetailRow}>
                  <Text style={styles.renewalLabel}>New Expiry</Text>
                  <Text style={[styles.renewalValue, { color: Colors.expiringSoon }]}>{formatDate(r.newExpiryDate)}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* ─── QR Code ──────────────────────────────── */}
      {member.qrCode ? (
        <View style={styles.qrCard}>
          <Text style={styles.sectionTitle}>QR Code</Text>
          <Image source={{ uri: member.qrCode }} style={styles.qrImage} />
        </View>
      ) : null}

      {/* ─── Attendance ───────────────────────────── */}
      <View style={styles.attendanceSection}>
        <Text style={styles.sectionTitle}>
          Attendance History ({attendance.length})
        </Text>
        {attendance.slice(0, 10).map((record, i) => (
          <View key={i} style={styles.attendRow}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.active} />
            <Text style={styles.attendDate}>{formatDate(record.date)}</Text>
            <Text style={styles.attendTime}>
              {new Date(record.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        ))}
        {attendance.length === 0 && (
          <Text style={styles.noAttend}>No attendance records</Text>
        )}
      </View>

      {/* ─── Action Buttons ───────────────────────── */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.renewBtn} onPress={openRenew}>
          <Ionicons name="refresh" size={18} color={Colors.background} />
          <Text style={styles.renewText}>Renew</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.payBtn}
          onPress={() => navigation.navigate('Payment', { memberId: member._id })}
        >
          <Ionicons name="cash" size={18} color={Colors.background} />
          <Text style={styles.payBtnText}>Payment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash" size={18} color={Colors.expired} />
        </TouchableOpacity>
      </View>

      {/* ─── Renew Modal ──────────────────────────── */}
      <Modal visible={renewModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Renew Membership</Text>
              <TouchableOpacity onPress={() => setRenewModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Current Expiry Info */}
            <View style={styles.currentExpiryCard}>
              <Text style={styles.currentExpiryLabel}>Current Expiry</Text>
              <Text style={styles.currentExpiryDate}>{formatDate(member.expiryDate)}</Text>
            </View>

            <Text style={styles.selectLabel}>Select Plan</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {plans.map((p) => (
                <TouchableOpacity
                  key={p._id}
                  style={[styles.planChip, renewForm.plan === p._id && styles.planChipActive]}
                  onPress={() => {
                    setRenewForm({ ...renewForm, plan: p._id });
                    setSelectedRenewPlan(p);
                  }}
                >
                  <Text style={[styles.planChipName, renewForm.plan === p._id && { color: Colors.primary }]}>
                    {p.planName}
                  </Text>
                  <Text style={[styles.planChipInfo, renewForm.plan === p._id && { color: Colors.primaryLight }]}>
                    {p.durationDays}d · ₹{p.price}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* New Expiry Preview */}
            {selectedRenewPlan && (
              <View style={styles.newExpiryPreview}>
                <Ionicons name="arrow-forward" size={16} color={Colors.active} />
                <Text style={styles.newExpiryText}>
                  New expiry: {(() => {
                    const currentExp = new Date(member.expiryDate);
                    const now = new Date();
                    const base = currentExp > now ? currentExp : now;
                    const newExp = new Date(base);
                    newExp.setDate(newExp.getDate() + selectedRenewPlan.durationDays);
                    return formatDate(newExp);
                  })()}
                </Text>
              </View>
            )}

            <View style={styles.modalInput}>
              <Ionicons name="cash-outline" size={20} color={Colors.textMuted} style={{ marginRight: 10 }} />
              <TextInput style={styles.input} placeholder="Paid Amount (₹)"
                placeholderTextColor={Colors.placeholder} keyboardType="numeric"
                value={renewForm.paidAmount}
                onChangeText={(v) => setRenewForm({ ...renewForm, paidAmount: v })} />
            </View>

            {/* Due Amount — auto-calculated */}
            {selectedRenewPlan && (() => {
              const paid = parseFloat(renewForm.paidAmount) || 0;
              const due = Math.max(0, selectedRenewPlan.price - paid);
              return (
                <View style={[styles.dueRow, { marginBottom: 12 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons
                      name={due > 0 ? 'alert-circle' : 'checkmark-circle'}
                      size={18}
                      color={due > 0 ? Colors.expired : Colors.active}
                    />
                    <Text style={[styles.dueLabel, { fontSize: 13 }]}>
                      {due > 0 ? 'Due Amount' : 'Fully Paid'}
                    </Text>
                  </View>
                  <Text style={[styles.dueValue, { fontSize: 16, color: due > 0 ? Colors.expired : Colors.active }]}>
                    ₹{due}
                  </Text>
                </View>
              );
            })()}

            <TouchableOpacity style={[styles.renewSaveBtn, renewSaving && { opacity: 0.7 }]}
              onPress={handleRenew} disabled={renewSaving}>
              {renewSaving ? <ActivityIndicator color={Colors.background} /> :
                <>
                  <Ionicons name="refresh" size={18} color={Colors.background} />
                  <Text style={styles.renewSaveText}>Renew Membership</Text>
                </>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingTop: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.card,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
  editBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primaryGlow,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.primary + '30',
  },
  profileSection: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 12 },
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.primaryGlow,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 36, fontWeight: '700', color: Colors.primary },
  name: { fontSize: 24, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  infoCard: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.text },

  // ─── Renewal History ──────────────────────
  renewalSection: { marginBottom: 20 },
  renewalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  renewalCount: { fontSize: 12, color: Colors.textMuted },
  noRenewals: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  noRenewalsText: { fontSize: 14, color: Colors.textMuted, marginTop: 8 },
  renewalCard: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 3, borderLeftColor: Colors.secondary,
  },
  renewalRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  renewalDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.secondary, marginRight: 10,
  },
  renewalDate: { fontSize: 14, fontWeight: '600', color: Colors.text },
  renewalDetails: {},
  renewalDetailRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3,
  },
  renewalLabel: { fontSize: 13, color: Colors.textSecondary },
  renewalValue: { fontSize: 13, fontWeight: '600', color: Colors.text },

  // ─── QR & Attendance ──────────────────────
  qrCard: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 20,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  qrImage: { width: 160, height: 160, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  attendanceSection: { marginBottom: 20 },
  attendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  attendDate: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  attendTime: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  noAttend: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingVertical: 12 },

  // ─── Actions ──────────────────────────────
  actions: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  renewBtn: {
    flex: 1, flexDirection: 'row', backgroundColor: Colors.primary, height: 48,
    borderRadius: 14, justifyContent: 'center', alignItems: 'center', gap: 6,
  },
  renewText: { fontSize: 15, fontWeight: '600', color: Colors.background },
  payBtn: {
    flex: 1, flexDirection: 'row', backgroundColor: Colors.secondary, height: 48,
    borderRadius: 14, justifyContent: 'center', alignItems: 'center', gap: 6,
  },
  payBtnText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  deleteBtn: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.expired + '18',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.expired + '30',
  },

  // ─── Modal ────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: Colors.border,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  currentExpiryCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.expiringSoonBg, borderRadius: 10, padding: 12, marginBottom: 16,
  },
  currentExpiryLabel: { fontSize: 13, color: Colors.expiringSoon, fontWeight: '500' },
  currentExpiryDate: { fontSize: 14, fontWeight: '700', color: Colors.expiringSoon },
  selectLabel: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8 },
  planChip: {
    backgroundColor: Colors.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    marginRight: 8, borderWidth: 1, borderColor: Colors.border,
  },
  planChipActive: { backgroundColor: Colors.primaryGlow, borderColor: Colors.primary },
  planChipName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  planChipInfo: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  newExpiryPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.activeBg, borderRadius: 10, padding: 12, marginBottom: 16,
  },
  newExpiryText: { fontSize: 14, fontWeight: '600', color: Colors.active },
  modalInput: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.inputBg, borderRadius: 12, height: 48,
    paddingHorizontal: 14, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.inputBorder,
  },
  input: { flex: 1, fontSize: 16, color: Colors.text },
  renewSaveBtn: {
    backgroundColor: Colors.primary, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
    flexDirection: 'row', gap: 8,
  },
  renewSaveText: { fontSize: 16, fontWeight: '700', color: Colors.background },
  dueRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderRadius: 10, backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
  },
  dueLabel: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary },
  dueValue: { fontSize: 18, fontWeight: '700' },
});

export default MemberProfileScreen;
