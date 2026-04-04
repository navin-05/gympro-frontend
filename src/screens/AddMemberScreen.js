import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image, Modal, Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../theme/colors';
import apiClient from '../api/client';

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

const calcExpiry = (startDate, plan) => {
  if (!startDate || !plan) return null;
  const expiry = new Date(startDate);
  expiry.setDate(expiry.getDate() + (plan.durationDays || 30));
  return expiry;
};

// ─── Simple Calendar Picker Component ────────────────
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

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={calStyles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={calStyles.container} onStartShouldSetResponder={() => true}>
          {/* Header */}
          <View style={calStyles.header}>
            <TouchableOpacity onPress={prevMonth} style={calStyles.navBtn}>
              <Ionicons name="chevron-back" size={20} color={Colors.text} />
            </TouchableOpacity>
            <Text style={calStyles.monthText}>{monthName}</Text>
            <TouchableOpacity onPress={nextMonth} style={calStyles.navBtn}>
              <Ionicons name="chevron-forward" size={20} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {/* Day names */}
          <View style={calStyles.dayNamesRow}>
            {dayNames.map((d) => (
              <Text key={d} style={calStyles.dayName}>{d}</Text>
            ))}
          </View>

          {/* Day grid */}
          <View style={calStyles.daysGrid}>
            {days.map((day, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  calStyles.dayCell,
                  isSelected(day) && calStyles.dayCellSelected,
                  isToday(day) && !isSelected(day) && calStyles.dayCellToday,
                ]}
                onPress={() => {
                  if (day) {
                    onSelect(new Date(year, month, day));
                    onClose();
                  }
                }}
                disabled={!day}
              >
                <Text style={[
                  calStyles.dayText,
                  !day && { color: 'transparent' },
                  isSelected(day) && calStyles.dayTextSelected,
                  isToday(day) && !isSelected(day) && { color: Colors.primary },
                ]}>
                  {day || ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Today button */}
          <TouchableOpacity
            style={calStyles.todayBtn}
            onPress={() => { onSelect(new Date()); onClose(); }}
          >
            <Text style={calStyles.todayBtnText}>Today</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const calStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  container: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 20, width: 320,
    borderWidth: 1, borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.card,
    justifyContent: 'center', alignItems: 'center',
  },
  monthText: { fontSize: 16, fontWeight: '600', color: Colors.text },
  dayNamesRow: { flexDirection: 'row', marginBottom: 8 },
  dayName: {
    flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600',
    color: Colors.textMuted,
  },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center',
    borderRadius: 10,
  },
  dayCellSelected: { backgroundColor: Colors.primary },
  dayCellToday: { backgroundColor: Colors.primaryGlow },
  dayText: { fontSize: 14, color: Colors.text },
  dayTextSelected: { color: Colors.background, fontWeight: '700' },
  todayBtn: {
    marginTop: 12, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 10, backgroundColor: Colors.card,
  },
  todayBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
});

// ─── Plan Dropdown Component ─────────────────────────
const PlanDropdown = ({ plans, selectedPlan, onSelect }) => {
  const [open, setOpen] = useState(false);

  return (
    <View style={{ marginBottom: 12 }}>
      <TouchableOpacity
        style={[
          dropStyles.trigger,
          open && { borderColor: Colors.primary },
        ]}
        onPress={() => setOpen(!open)}
      >
        <Ionicons name="ribbon-outline" size={20} color={Colors.textMuted} style={{ marginRight: 10 }} />
        <Text style={[
          dropStyles.triggerText,
          !selectedPlan && { color: Colors.placeholder },
        ]}>
          {selectedPlan
            ? `${selectedPlan.planName} — ${selectedPlan.durationDays} days — ₹${selectedPlan.price}`
            : 'Select Plan'}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.textMuted}
        />
      </TouchableOpacity>

      {open && (
        <View style={dropStyles.listWrap}>
          {plans.length === 0 ? (
            <View style={dropStyles.emptyRow}>
              <Text style={dropStyles.emptyText}>No plans available. Create a plan first.</Text>
            </View>
          ) : (
            plans.map((plan) => (
              <TouchableOpacity
                key={plan._id}
                style={[
                  dropStyles.item,
                  selectedPlan?._id === plan._id && dropStyles.itemActive,
                ]}
                onPress={() => { onSelect(plan); setOpen(false); }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[
                    dropStyles.itemName,
                    selectedPlan?._id === plan._id && { color: Colors.primary },
                  ]}>
                    {plan.planName}
                  </Text>
                  <Text style={dropStyles.itemMeta}>
                    {plan.durationDays} days • ₹{plan.price}
                  </Text>
                </View>
                {selectedPlan?._id === plan._id && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
};

const dropStyles = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg,
    borderRadius: 12, paddingHorizontal: 14, height: 52,
    borderWidth: 1, borderColor: Colors.inputBorder,
  },
  triggerText: { flex: 1, fontSize: 16, color: Colors.text },
  listWrap: {
    backgroundColor: Colors.card, borderRadius: 12, marginTop: 4,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  itemActive: { backgroundColor: Colors.primaryGlow },
  itemName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  itemMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  emptyRow: { padding: 16 },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
});

// ═══════════════════════════════════════════════════════
// ─── Main AddMemberScreen ────────────────────────────
// ═══════════════════════════════════════════════════════
const AddMemberScreen = ({ navigation }) => {
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({
    photo: '', name: '', mobile: '', email: '',
    plan: '', paidAmount: '', referredBy: '',
  });
  const [startDate, setStartDate] = useState(new Date());
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    try {
      const res = await apiClient.get('/plans');
      console.log('[AddMember] Fetched plans:', res.data?.length || 0);
      setPlans(res.data || []);
    } catch (err) {
      console.log('[AddMember] Plans error:', err.message);
    }
  };

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      updateField('photo', `data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const selectPlan = (plan) => {
    console.log('[AddMember] Selected plan:', plan.planName, plan.durationDays, 'days');
    setSelectedPlan(plan);
    updateField('plan', plan._id);
  };

  // ─── Auto-calculated expiry date ──────────────────
  const expiryDate = useMemo(() => {
    return calcExpiry(startDate, selectedPlan);
  }, [startDate, selectedPlan]);

  const getDueAmount = () => {
    if (!selectedPlan) return 0;
    const paid = parseFloat(form.paidAmount) || 0;
    return Math.max(0, selectedPlan.price - paid);
  };

  const handleSave = async () => {
    if (!form.name || !form.mobile || !form.plan) {
      Alert.alert('Error', 'Name, mobile, and plan are required');
      return;
    }
    setSaving(true);
    try {
      const data = {
        ...form,
        startDate: formatDateISO(startDate),
        paidAmount: parseFloat(form.paidAmount) || 0,
      };
      console.log('[AddMember] Saving member:', data.name, 'plan:', data.plan);
      await apiClient.post('/members', data);
      setSaving(false);

      // Show success banner
      setShowSuccess(true);
      Animated.timing(successAnim, {
        toValue: 1, duration: 300, useNativeDriver: true,
      }).start();

      // Navigate to Dashboard after 1.5s
      setTimeout(() => {
        setShowSuccess(false);
        navigation.getParent()?.navigate('Dashboard');
      }, 1500);
    } catch (err) {
      setSaving(false);
      const errMsg = err.response?.data?.error || err.message || 'Failed to add member';
      console.log('[AddMember] Save error:', errMsg);
      Alert.alert('Error', errMsg);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Member</Text>
      </View>

      {/* Photo */}
      <TouchableOpacity style={styles.photoWrap} onPress={pickPhoto}>
        {form.photo ? (
          <Image source={{ uri: form.photo }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="camera" size={28} color={Colors.textMuted} />
            <Text style={styles.photoText}>Add Photo</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Text Fields */}
      {[
        { key: 'name', icon: 'person-outline', placeholder: 'Full Name' },
        { key: 'mobile', icon: 'call-outline', placeholder: 'Mobile Number', keyboard: 'phone-pad' },
        { key: 'email', icon: 'mail-outline', placeholder: 'Email (optional)', keyboard: 'email-address' },
        { key: 'referredBy', icon: 'gift-outline', placeholder: 'Referral Code (optional)' },
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

      {/* ─── DOJ (Date of Joining) ─────────────────── */}
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

      {/* Calendar Picker Modal */}
      <CalendarPicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={(date) => {
          console.log('[AddMember] DOJ selected:', formatDateISO(date));
          setStartDate(date);
        }}
        currentDate={startDate}
      />

      {/* ─── Plan Selection (Dropdown) ──────────────── */}
      <Text style={styles.sectionTitle}>Select Plan</Text>
      <PlanDropdown
        plans={plans}
        selectedPlan={selectedPlan}
        onSelect={selectPlan}
      />

      {/* ─── Expiry Date (Auto-calculated, read-only) ─ */}
      <Text style={styles.sectionTitle}>Expiry Date</Text>
      <View style={[styles.inputGroup, styles.readOnlyField]}>
        <Ionicons name="calendar" size={20} color={Colors.expiringSoon} style={styles.inputIcon} />
        <Text style={[
          styles.dateText,
          !expiryDate && { color: Colors.placeholder },
          expiryDate && { color: Colors.expiringSoon },
        ]}>
          {expiryDate ? formatDateDisplay(expiryDate) : 'Auto-calculated from DOJ + Plan'}
        </Text>
        {expiryDate && (
          <View style={styles.autoBadge}>
            <Text style={styles.autoBadgeText}>AUTO</Text>
          </View>
        )}
      </View>

      {/* ─── Summary Card ──────────────────────────── */}
      {selectedPlan && (
        <View style={styles.calcCard}>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Plan</Text>
            <Text style={styles.calcValue}>{selectedPlan.planName}</Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Duration</Text>
            <Text style={styles.calcValue}>{selectedPlan.durationDays} days</Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Start → Expiry</Text>
            <Text style={styles.calcValue}>
              {formatDateDisplay(startDate)} → {expiryDate ? formatDateDisplay(expiryDate) : '—'}
            </Text>
          </View>
          <View style={[styles.calcRow, { marginBottom: 0 }]}>
            <Text style={styles.calcLabel}>Plan Price</Text>
            <Text style={[styles.calcValue, { color: Colors.primary }]}>₹{selectedPlan.price}</Text>
          </View>
        </View>
      )}

      {/* ─── Due Amount (auto-calculated, read-only) ── */}
      {selectedPlan && (
        <>
          <Text style={styles.sectionTitle}>Due Amount</Text>
          <View style={[styles.inputGroup, styles.readOnlyField]}>
            <Ionicons name="wallet-outline" size={20} color={getDueAmount() > 0 ? Colors.expired : Colors.active} style={styles.inputIcon} />
            <Text style={[styles.dateText, { color: getDueAmount() > 0 ? Colors.expired : Colors.active, fontWeight: '700' }]}>
              ₹{getDueAmount()}
            </Text>
            <View style={[styles.autoBadge, { backgroundColor: getDueAmount() > 0 ? Colors.expiredBg : Colors.activeBg }]}>
              <Text style={[styles.autoBadgeText, { color: getDueAmount() > 0 ? Colors.expired : Colors.active }]}>
                {getDueAmount() > 0 ? 'PENDING' : 'PAID'}
              </Text>
            </View>
          </View>
        </>
      )}

      {/* ─── Paid Amount ───────────────────────────── */}
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

      {/* ─── Due Amount Banner ─────────────────────── */}
      {selectedPlan && (
        <View style={[styles.dueRow, getDueAmount() > 0 ? styles.duePending : styles.duePaid]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons
              name={getDueAmount() > 0 ? 'alert-circle' : 'checkmark-circle'}
              size={20}
              color={getDueAmount() > 0 ? Colors.expired : Colors.active}
            />
            <Text style={styles.dueLabel}>
              {getDueAmount() > 0 ? 'Due Amount' : 'Fully Paid'}
            </Text>
          </View>
          <Text style={[styles.dueValue, getDueAmount() > 0 ? { color: Colors.expired } : { color: Colors.active }]}>
            ₹{getDueAmount()}
          </Text>
        </View>
      )}

      {/* ─── Save Button ───────────────────────────── */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.7 }]}
        onPress={handleSave} disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <>
            <Ionicons name="person-add" size={20} color={Colors.background} />
            <Text style={styles.saveBtnText}>Add Member</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Bottom spacing */}
      <View style={{ height: 20 }} />
    </ScrollView>

    {/* ─── Success Toast Overlay ──────────────────── */}
    {showSuccess && (
      <Animated.View style={[
        styles.successOverlay,
        { opacity: successAnim, transform: [{ translateY: successAnim.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }] },
      ]}>
        <View style={styles.successCard}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark-circle" size={48} color={Colors.active} />
          </View>
          <Text style={styles.successTitle}>Member Added!</Text>
          <Text style={styles.successSubtitle}>Redirecting to dashboard...</Text>
        </View>
      </Animated.View>
    )}
  </View>
  );
};

// ═══════════════════════════════════════════════════════
// ─── Styles ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingTop: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.card,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  photoWrap: { alignSelf: 'center', marginBottom: 24 },
  photo: { width: 96, height: 96, borderRadius: 48 },
  photoPlaceholder: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.card,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2,
    borderColor: Colors.border, borderStyle: 'dashed',
  },
  photoText: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  inputGroup: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg,
    borderRadius: 12, paddingHorizontal: 14, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.inputBorder, height: 52,
  },
  readOnlyField: {
    backgroundColor: Colors.card, borderColor: Colors.border,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: Colors.text },
  dateText: { flex: 1, fontSize: 16, color: Colors.text },
  sectionTitle: {
    fontSize: 14, fontWeight: '600', color: Colors.textSecondary,
    marginBottom: 8, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  autoBadge: {
    backgroundColor: Colors.expiringSoonBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  autoBadgeText: {
    fontSize: 10, fontWeight: '700', color: Colors.expiringSoon, letterSpacing: 1,
  },
  calcCard: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  calcLabel: { fontSize: 13, color: Colors.textSecondary },
  calcValue: { fontSize: 13, fontWeight: '600', color: Colors.text },
  dueRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderRadius: 12, marginBottom: 20,
  },
  duePending: { backgroundColor: Colors.expiredBg },
  duePaid: { backgroundColor: Colors.activeBg },
  dueLabel: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary },
  dueValue: { fontSize: 18, fontWeight: '700' },
  saveBtn: {
    backgroundColor: Colors.primary, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: Colors.background },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 14, 26, 0.85)',
    justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  successCard: {
    backgroundColor: Colors.surface, borderRadius: 24, padding: 40,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.active + '30',
    width: 280,
  },
  successIconWrap: { marginBottom: 16 },
  successTitle: {
    fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 14, color: Colors.textSecondary, textAlign: 'center',
  },
});

export default AddMemberScreen;
