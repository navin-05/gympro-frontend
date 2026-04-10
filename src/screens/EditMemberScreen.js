import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import Colors from '../theme/colors';
import apiClient from '../api/client';

const EMPTY_PLANS = [];

// ─── Date Helpers ────────────────────────────────────
const formatDateDisplay = (date) => {
  if (!date) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateISO = (date) => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// ─── Calendar Picker (same as AddMemberScreen) ──────
const CalendarPicker = ({ visible, onClose, onSelect, currentDate }) => {
  const [viewDate, setViewDate] = useState(currentDate || new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };
  const isSelected = (day) => {
    if (!currentDate || !day) return false;
    return day === currentDate.getDate() && month === currentDate.getMonth() && year === currentDate.getFullYear();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={calStyles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={calStyles.container} onStartShouldSetResponder={() => true}>
          <View style={calStyles.header}>
            <TouchableOpacity onPress={() => setViewDate(new Date(year, month - 1, 1))} style={calStyles.navBtn}>
              <Ionicons name="chevron-back" size={20} color={Colors.text} />
            </TouchableOpacity>
            <Text style={calStyles.monthText}>{monthName}</Text>
            <TouchableOpacity onPress={() => setViewDate(new Date(year, month + 1, 1))} style={calStyles.navBtn}>
              <Ionicons name="chevron-forward" size={20} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <View style={calStyles.dayNamesRow}>
            {dayNames.map((d) => <Text key={d} style={calStyles.dayName}>{d}</Text>)}
          </View>
          <View style={calStyles.daysGrid}>
            {days.map((day, idx) => (
              <TouchableOpacity key={idx}
                style={[calStyles.dayCell, isSelected(day) && calStyles.dayCellSelected, isToday(day) && !isSelected(day) && calStyles.dayCellToday]}
                onPress={() => { if (day) { onSelect(new Date(year, month, day)); onClose(); } }}
                disabled={!day}
              >
                <Text style={[calStyles.dayText, !day && { color: 'transparent' }, isSelected(day) && calStyles.dayTextSelected, isToday(day) && !isSelected(day) && { color: Colors.primary }]}>
                  {day || ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={calStyles.todayBtn} onPress={() => { onSelect(new Date()); onClose(); }}>
            <Text style={calStyles.todayBtnText}>Today</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const calStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  container: { backgroundColor: Colors.surface, borderRadius: 20, padding: 20, width: 320, borderWidth: 1, borderColor: Colors.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  navBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.card, justifyContent: 'center', alignItems: 'center' },
  monthText: { fontSize: 16, fontWeight: '600', color: Colors.text },
  dayNamesRow: { flexDirection: 'row', marginBottom: 8 },
  dayName: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  dayCellSelected: { backgroundColor: Colors.primary },
  dayCellToday: { backgroundColor: Colors.primaryGlow },
  dayText: { fontSize: 14, color: Colors.text },
  dayTextSelected: { color: Colors.background, fontWeight: '700' },
  todayBtn: { marginTop: 12, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.card },
  todayBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
});

// ═══════════════════════════════════════════════════════
// ─── EditMemberScreen ────────────────────────────────
// ═══════════════════════════════════════════════════════
const EditMemberScreen = ({ route, navigation }) => {
  const memberId = route.params?.memberId || route.params?.id;
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', mobile: '', email: '', paidAmount: '' });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const saveLockRef = useRef(false);

  const memberQuery = useQuery({
    queryKey: ['member', memberId],
    queryFn: async () => {
      const res = await apiClient.get(`/members/${memberId}`);
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const plansQuery = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await apiClient.get('/plans');
      return res.data || [];
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const plans = Array.isArray(plansQuery.data) ? plansQuery.data : EMPTY_PLANS;

  useEffect(() => {
    const m = memberQuery.data;
    const list = Array.isArray(plansQuery.data) ? plansQuery.data : null;
    if (!m || !list?.length) return;

    setForm({
      name: m.name || '',
      mobile: m.mobile || '',
      email: m.email || '',
      paidAmount: String(m.paidAmount || 0),
    });

    if (m.startDate) setStartDate(new Date(m.startDate));

    const planId = m.plan?._id || m.plan || '';
    const planObj = list.find((p) => p._id === planId);
    if (planObj) setSelectedPlan(planObj);
  }, [memberQuery.data, plansQuery.data]);

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  // ─── Auto-calculated values ───────────────────────
  const expiryDate = useMemo(() => {
    if (!startDate || !selectedPlan) return null;
    const exp = new Date(startDate);
    exp.setDate(exp.getDate() + (selectedPlan.durationDays || 30));
    return exp;
  }, [startDate, selectedPlan]);

  const dueAmount = useMemo(() => {
    if (!selectedPlan) return 0;
    const paid = parseFloat(form.paidAmount) || 0;
    return Math.max(0, selectedPlan.price - paid);
  }, [selectedPlan, form.paidAmount]);

  const updateMemberMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.put(`/members/${memberId}`, payload);
      return res.data;
    },
    onSuccess: (updatedMember) => {
      saveLockRef.current = false;
      queryClient.setQueryData(['member', memberId], updatedMember);
      queryClient.setQueryData(['members'], (old) => {
        const prev = Array.isArray(old) ? old : [];
        return prev.map((m) => (m._id === memberId ? { ...m, ...updatedMember } : m));
      });

      Toast.show({
        type: 'success',
        text1: 'Updated Successfully',
        text2: `${updatedMember?.name || 'Member'} details updated`,
        position: 'top',
        visibilityTime: 2000,
      });

      setTimeout(() => {
        navigation.replace('MemberProfile', { memberId });
      }, 500);
    },
    onError: () => {
      saveLockRef.current = false;
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: 'Please try again',
      });
    },
  });

  const handleSave = () => {
    if (!form.name || !form.mobile) {
      Alert.alert('Error', 'Name and mobile are required');
      return;
    }
    if (updateMemberMutation.isPending || saveLockRef.current) return;
    saveLockRef.current = true;
    updateMemberMutation.mutate({
      name: form.name,
      mobile: form.mobile,
      email: form.email,
      plan: selectedPlan?._id || '',
      startDate: formatDateISO(startDate),
      paidAmount: parseFloat(form.paidAmount) || 0,
    });
  };

  const loading = memberQuery.isLoading || plansQuery.isLoading;
  const saving = updateMemberMutation.isPending;

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Member</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Text Fields */}
      {[
        { key: 'name', icon: 'person-outline', placeholder: 'Full Name' },
        { key: 'mobile', icon: 'call-outline', placeholder: 'Mobile Number', keyboard: 'phone-pad' },
        { key: 'email', icon: 'mail-outline', placeholder: 'Email', keyboard: 'email-address' },
      ].map((field) => (
        <View key={field.key} style={styles.inputGroup}>
          <Ionicons name={field.icon} size={20} color={Colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={field.placeholder}
            placeholderTextColor={Colors.placeholder}
            value={form[field.key]}
            onChangeText={(v) => updateField(field.key, v)}
            keyboardType={field.keyboard || 'default'}
            autoCapitalize={field.key === 'email' ? 'none' : 'words'}
          />
        </View>
      ))}

      {/* ─── Date of Joining (Clickable Calendar) ──── */}
      <Text style={styles.sectionTitle}>Date of Joining</Text>
      <TouchableOpacity
        style={styles.inputGroup}
        onPress={() => setShowDatePicker(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar" size={20} color={Colors.primary} style={styles.inputIcon} />
        <Text style={styles.dateText}>{formatDateDisplay(startDate)}</Text>
        <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
      </TouchableOpacity>

      <CalendarPicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={(date) => setStartDate(date)}
        currentDate={startDate}
      />

      {/* ─── Plan Selection ────────────────────────── */}
      <Text style={styles.sectionTitle}>Select Plan</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.planScroll}>
        {plans.map((plan) => (
          <TouchableOpacity
            key={plan._id}
            style={[styles.planChip, selectedPlan?._id === plan._id && styles.planChipActive]}
            onPress={() => setSelectedPlan(plan)}
          >
            <Text style={[styles.planChipName, selectedPlan?._id === plan._id && { color: Colors.primary }]}>
              {plan.planName}
            </Text>
            <Text style={[styles.planChipInfo, selectedPlan?._id === plan._id && { color: Colors.primary }]}>
              {plan.durationDays}d · ₹{plan.price}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ─── Expiry Date (Auto-calculated) ─────────── */}
      <Text style={styles.sectionTitle}>Expiry Date</Text>
      <View style={[styles.inputGroup, styles.readOnlyField]}>
        <Ionicons name="calendar" size={20} color={Colors.expiringSoon} style={styles.inputIcon} />
        <Text style={[styles.dateText, !expiryDate && { color: Colors.placeholder }, expiryDate && { color: Colors.expiringSoon }]}>
          {expiryDate ? formatDateDisplay(expiryDate) : 'Select plan to calculate'}
        </Text>
        {expiryDate && (
          <View style={styles.autoBadge}>
            <Text style={styles.autoBadgeText}>AUTO</Text>
          </View>
        )}
      </View>

      {/* ─── Due Amount (₹) — auto-calculated ──────── */}
      {selectedPlan && (
        <>
          <Text style={styles.sectionTitle}>Due Amount</Text>
          <View style={[styles.inputGroup, styles.readOnlyField]}>
            <Ionicons name="wallet-outline" size={20} color={dueAmount > 0 ? Colors.expired : Colors.active} style={styles.inputIcon} />
            <Text style={[styles.dateText, { color: dueAmount > 0 ? Colors.expired : Colors.active, fontWeight: '700' }]}>
              ₹{dueAmount}
            </Text>
            <View style={[styles.autoBadge, { backgroundColor: dueAmount > 0 ? Colors.expiredBg : Colors.activeBg }]}>
              <Text style={[styles.autoBadgeText, { color: dueAmount > 0 ? Colors.expired : Colors.active }]}>
                {dueAmount > 0 ? 'PENDING' : 'PAID'}
              </Text>
            </View>
          </View>
        </>
      )}

      {/* ─── Paid Amount (₹) ───────────────────────── */}
      <View style={styles.inputGroup}>
        <Ionicons name="cash-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Paid Amount (₹)"
          placeholderTextColor={Colors.placeholder}
          value={form.paidAmount}
          onChangeText={(v) => updateField('paidAmount', v)}
          keyboardType="numeric"
        />
      </View>

      {/* ─── Save Button ───────────────────────────── */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.7 }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <>
            <Ionicons name="checkmark" size={20} color={Colors.background} />
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </>
        )}
      </TouchableOpacity>
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
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  inputGroup: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg,
    borderRadius: 12, paddingHorizontal: 14, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.inputBorder, height: 52,
  },
  readOnlyField: { backgroundColor: Colors.card, borderColor: Colors.border },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: Colors.text },
  dateText: { flex: 1, fontSize: 16, color: Colors.text },
  sectionTitle: {
    fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8, marginTop: 8,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  autoBadge: {
    backgroundColor: Colors.expiringSoonBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  autoBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.expiringSoon, letterSpacing: 1 },
  planScroll: { marginBottom: 16 },
  planChip: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginRight: 10,
    minWidth: 110, borderWidth: 1, borderColor: Colors.border,
  },
  planChipActive: { backgroundColor: Colors.primaryGlow, borderColor: Colors.primary },
  planChipName: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  planChipInfo: { fontSize: 12, color: Colors.textSecondary },
  saveBtn: {
    backgroundColor: Colors.primary, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: Colors.background },
});

export default EditMemberScreen;
