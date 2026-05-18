import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image, Switch, Platform,
  Modal, Pressable,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import Colors from '../theme/colors';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

const DEFAULT_SCHEDULED_TIME = '09:00 PM';

function getDeviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function formatTimeAmPm(date) {
  const h24 = date.getHours();
  const m = date.getMinutes();
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Wall-clock hour/minute from "09:00 PM" — independent of device timezone. */
function parseAmPmToHourMinute(str) {
  const s = (str || DEFAULT_SCHEDULED_TIME).trim();
  const match = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return { scheduledHour: 21, scheduledMinute: 0 };
  }
  let h12 = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  const ap = match[3].toUpperCase();
  if (h12 < 1 || h12 > 12 || min < 0 || min > 59) {
    return { scheduledHour: 21, scheduledMinute: 0 };
  }
  let h24;
  if (ap === 'AM') {
    h24 = h12 === 12 ? 0 : h12;
  } else {
    h24 = h12 === 12 ? 12 : h12 + 12;
  }
  return { scheduledHour: h24, scheduledMinute: min };
}

function parseTimeAmPmToDate(str) {
  const s = (str || DEFAULT_SCHEDULED_TIME).trim();
  const match = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const d = new Date();
  if (!match) {
    d.setHours(21, 0, 0, 0);
    return d;
  }
  let h12 = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  const ap = match[3].toUpperCase();
  if (h12 < 1 || h12 > 12 || min < 0 || min > 59) {
    d.setHours(21, 0, 0, 0);
    return d;
  }
  let h24;
  if (ap === 'AM') {
    h24 = h12 === 12 ? 0 : h12;
  } else {
    h24 = h12 === 12 ? 12 : h12 + 12;
  }
  d.setHours(h24, min, 0, 0);
  return d;
}

function scheduledTimeTo24hValue(str) {
  const d = parseTimeAmPmToDate(str);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function parse24hToAmPm(value) {
  const m = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return DEFAULT_SCHEDULED_TIME;
  const h24 = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (Number.isNaN(h24) || Number.isNaN(min)) return DEFAULT_SCHEDULED_TIME;
  const d = new Date();
  d.setHours(h24, min, 0, 0);
  return formatTimeAmPm(d);
}

const GymProfileScreen = () => {
  const { logout } = useAuth();
  const [form, setForm] = useState({
    gymName: '', address: '', city: '', phone: '', mapLink: '', openingHours: '', logo: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifScheduledTime, setNotifScheduledTime] = useState(DEFAULT_SCHEDULED_TIME);
  const [timePickerDate, setTimePickerDate] = useState(() => parseTimeAmPmToDate(DEFAULT_SCHEDULED_TIME));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [savingAutomation, setSavingAutomation] = useState(false);
  const [webTimeValue, setWebTimeValue] = useState(() => scheduledTimeTo24hValue(DEFAULT_SCHEDULED_TIME));
  const webTimeInputRef = useRef(null);

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  useFocusEffect(useCallback(() => {
    loadProfile();
  }, []));

  const loadProfile = async () => {
    setLoading(true);
    try {
      const [gymRes, meRes] = await Promise.all([
        apiClient.get('/gym/profile').catch(() => ({ data: null })),
        apiClient.get('/auth/me').catch(() => ({ data: null })),
      ]);
      if (gymRes.data) {
        setForm({
          gymName: gymRes.data.gymName || '',
          address: gymRes.data.address || '',
          city: gymRes.data.city || '',
          phone: gymRes.data.phone || '',
          mapLink: gymRes.data.mapLink || '',
          openingHours: gymRes.data.openingHours || '',
          logo: gymRes.data.logo || '',
        });
        setHasProfile(true);
      }
      const ns = meRes.data?.notificationSettings;
      if (ns) {
        setNotifEnabled(ns.enabled === true);
        let pickerDate;
        if (
          typeof ns.scheduledHour === 'number'
          && typeof ns.scheduledMinute === 'number'
          && ns.scheduledHour >= 0
          && ns.scheduledHour <= 23
          && ns.scheduledMinute >= 0
          && ns.scheduledMinute <= 59
        ) {
          pickerDate = new Date();
          pickerDate.setHours(ns.scheduledHour, ns.scheduledMinute, 0, 0);
        } else {
          const st = typeof ns.scheduledTime === 'string' && ns.scheduledTime.trim()
            ? ns.scheduledTime.trim()
            : DEFAULT_SCHEDULED_TIME;
          pickerDate = parseTimeAmPmToDate(st);
        }
        const formatted = formatTimeAmPm(pickerDate);
        setNotifScheduledTime(formatted);
        setTimePickerDate(pickerDate);
        setWebTimeValue(scheduledTimeTo24hValue(formatted));
      }
    } catch (err) {
      console.log('Profile load error:', err.message);
    }
    setLoading(false);
  };

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      updateField('logo', `data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const saveProfile = async () => {
    if (!form.gymName.trim()) {
      Alert.alert('Error', 'Gym name is required');
      return;
    }
    setSaving(true);
    try {
      if (hasProfile) {
        await apiClient.put('/gym/profile', form);
      } else {
        await apiClient.post('/gym/profile', form);
        setHasProfile(true);
      }
      Alert.alert('Success', 'Gym profile saved!');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save');
    }
    setSaving(false);
  };

  const onAutomationTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event?.type === 'dismissed') {
        return;
      }
    }
    if (selectedDate) {
      setTimePickerDate(selectedDate);
      const formatted = formatTimeAmPm(selectedDate);
      setNotifScheduledTime(formatted);
      setWebTimeValue(scheduledTimeTo24hValue(formatted));
    }
  };

  const openTimePicker = () => {
    if (Platform.OS === 'web') {
      const el = webTimeInputRef.current;
      if (el && typeof el.showPicker === 'function') {
        el.showPicker();
      } else if (el) {
        el.click();
      }
      return;
    }
    setShowTimePicker(true);
  };

  const onWebTimeInputChange = (e) => {
    const value = e?.target?.value;
    if (!value) return;
    setWebTimeValue(value);
    const formatted = parse24hToAmPm(value);
    setNotifScheduledTime(formatted);
    setTimePickerDate(parseTimeAmPmToDate(formatted));
  };

  const saveAutomationSettings = async () => {
    setSavingAutomation(true);
    try {
      const tz = getDeviceTimezone();
      const { scheduledHour, scheduledMinute } = parseAmPmToHourMinute(notifScheduledTime);
      await apiClient.put('/notifications/automation', {
        enabled: notifEnabled,
        scheduledHour,
        scheduledMinute,
        scheduledTime: notifScheduledTime,
        timezone: tz,
      });
      if (Platform.OS === 'ios') {
        setShowTimePicker(false);
      }
      Toast.show({
        type: 'success',
        text1: 'Notification automation settings saved successfully',
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err.response?.data?.error || err.response?.data?.message || 'Failed to save settings',
      });
    }
    setSavingAutomation(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const fields = [
    { key: 'gymName', icon: 'fitness-outline', placeholder: 'Gym Name', required: true },
    { key: 'address', icon: 'location-outline', placeholder: 'Address', multiline: true },
    { key: 'city', icon: 'business-outline', placeholder: 'City' },
    { key: 'phone', icon: 'call-outline', placeholder: 'Contact Phone', keyboardType: 'phone-pad' },
    { key: 'mapLink', icon: 'map-outline', placeholder: 'Google Maps Link' },
    { key: 'openingHours', icon: 'time-outline', placeholder: 'Opening Hours (e.g. 6 AM - 10 PM)' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      <Text style={styles.title}>Gym Profile</Text>
      <Text style={styles.subtitle}>Configure your gym information</Text>

      {/* Logo */}
      <TouchableOpacity style={styles.logoWrap} onPress={pickLogo}>
        {form.logo ? (
          <Image source={{ uri: form.logo }} style={styles.logo} />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Ionicons name="camera" size={32} color={Colors.textMuted} />
            <Text style={styles.logoText}>Upload Logo</Text>
          </View>
        )}
      </TouchableOpacity>

      {fields.map((field) => (
        <View key={field.key} style={[styles.inputGroup, field.multiline && { height: 80, alignItems: 'flex-start', paddingTop: 14 }]}>
          <Ionicons name={field.icon} size={20} color={Colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, field.multiline && { textAlignVertical: 'top' }]}
            placeholder={field.placeholder}
            placeholderTextColor={Colors.placeholder}
            value={form[field.key]}
            onChangeText={(v) => updateField(field.key, v)}
            keyboardType={field.keyboardType || 'default'}
            multiline={field.multiline}
          />
        </View>
      ))}

      <Text style={styles.sectionHeading}>Automated WhatsApp Notifications</Text>
      <Text style={styles.sectionHint}>Daily membership summary via your existing WhatsApp setup.</Text>

      <View style={[styles.inputGroup, styles.switchRow]}>
        <Ionicons name="notifications-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
        <Text style={styles.switchLabel}>Enable Automated Notifications</Text>
        <Switch
          value={notifEnabled}
          onValueChange={setNotifEnabled}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor={Colors.background}
        />
      </View>

      <Pressable
        style={[styles.inputGroup, styles.timeRow]}
        onPress={openTimePicker}
        accessibilityRole="button"
        accessibilityLabel="Automated Message Time"
      >
        {Platform.OS === 'web' && (
          <input
            ref={webTimeInputRef}
            type="time"
            value={webTimeValue}
            onChange={onWebTimeInputChange}
            style={styles.webTimeInput}
            aria-label="Automated Message Time"
          />
        )}
        <Ionicons name="time-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
        <View style={styles.timeRowText} pointerEvents="none">
          <Text style={styles.timeRowLabel}>Automated Message Time</Text>
          <Text style={styles.timeRowValue}>{notifScheduledTime}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </Pressable>

      <Modal
        visible={showTimePicker && Platform.OS !== 'web'}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowTimePicker(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.iosPickerHeader}>
              <Text style={styles.modalTitle}>Select time</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Text style={styles.iosPickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={timePickerDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onAutomationTimeChange}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <TouchableOpacity
        style={[styles.automationSaveBtn, savingAutomation && { opacity: 0.7 }]}
        onPress={saveAutomationSettings}
        disabled={savingAutomation}
      >
        {savingAutomation ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <Text style={styles.automationSaveBtnText}>Save notification automation</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.7 }]}
        onPress={saveProfile} disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <Text style={styles.saveBtnText}>Save Profile</Text>
        )}
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity
        style={styles.logoutBtn}
        activeOpacity={0.7}
        onPress={() => {
          console.log('[GymProfile] Logout button pressed');
          if (typeof window !== 'undefined' && window.confirm) {
            const confirmed = window.confirm('Are you sure you want to logout?');
            if (confirmed) {
              console.log('[GymProfile] Logging out...');
              logout();
            }
          } else {
            Alert.alert(
              'Logout',
              'Are you sure you want to logout?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: () => { console.log('[GymProfile] Logging out...'); logout(); } },
              ]
            );
          }
        }}
      >
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutBtnText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingTop: 20 },
  title: { fontSize: 26, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 24 },
  logoWrap: { alignSelf: 'center', marginBottom: 24 },
  logo: { width: 100, height: 100, borderRadius: 24 },
  logoPlaceholder: {
    width: 100, height: 100, borderRadius: 24, backgroundColor: Colors.card,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2,
    borderColor: Colors.border, borderStyle: 'dashed',
  },
  logoText: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  inputGroup: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg,
    borderRadius: 12, paddingHorizontal: 14, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.inputBorder, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: Colors.text },
  sectionHeading: {
    fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 8, marginBottom: 6,
  },
  sectionHint: {
    fontSize: 13, color: Colors.textSecondary, marginBottom: 14, lineHeight: 18,
  },
  switchRow: { justifyContent: 'space-between' },
  switchLabel: { flex: 1, fontSize: 15, color: Colors.text, marginRight: 8 },
  timeRow: { minHeight: 56, alignItems: 'center', position: 'relative', zIndex: 2 },
  timeRowText: { flex: 1 },
  timeRowLabel: { fontSize: 12, color: Colors.textMuted, marginBottom: 2 },
  timeRowValue: { fontSize: 16, fontWeight: '600', color: Colors.text },
  webTimeInput: Platform.OS === 'web' ? {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
    zIndex: 10,
    margin: 0,
    padding: 0,
    border: 'none',
  } : {},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  iosPickerDone: { fontSize: 16, fontWeight: '600', color: Colors.primary },
  automationSaveBtn: {
    backgroundColor: Colors.primary, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginTop: 8, marginBottom: 4,
  },
  automationSaveBtnText: { fontSize: 15, fontWeight: '700', color: Colors.background },
  saveBtn: {
    backgroundColor: Colors.primary, height: 52, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginTop: 12,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: Colors.background },
  logoutBtn: {
    backgroundColor: '#FF4D4D', height: 52, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginTop: 16, marginBottom: 40,
    flexDirection: 'row', gap: 8,
  },
  logoutBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

export default GymProfileScreen;
