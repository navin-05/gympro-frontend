import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../theme/colors';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

const GymProfileSetupScreen = () => {
  const { user, completeProfile } = useAuth();
  const [form, setForm] = useState({
    gymName: user?.gymName || '',
    address: '',
    city: '',
    phone: user?.mobile || '',
    openingHours: '',
    mapLink: '',
    logo: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const updateField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    // Clear error on edit
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
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

  const validate = () => {
    const newErrors = {};
    if (!form.gymName.trim()) newErrors.gymName = 'Gym name is required';
    if (!form.address.trim()) newErrors.address = 'Address is required';
    if (!form.city.trim()) newErrors.city = 'City is required';
    if (!form.phone.trim()) newErrors.phone = 'Contact phone is required';
    if (!form.openingHours.trim()) newErrors.openingHours = 'Opening hours are required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValid = form.gymName.trim() && form.address.trim() && form.city.trim()
    && form.phone.trim() && form.openingHours.trim();

  const handleSave = async () => {
    if (!validate()) {
      Alert.alert('Missing Fields', 'Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/gym/profile', form);
      // Mark profile as complete in auth context (triggers navigation to MainTabs)
      await completeProfile();
    } catch (err) {
      // If profile already exists, try PUT instead
      if (err.response?.status === 400 && err.response?.data?.error?.includes('already exists')) {
        try {
          await apiClient.put('/gym/profile', form);
          await completeProfile();
          return;
        } catch (putErr) {
          Alert.alert('Error', putErr.response?.data?.error || 'Failed to save profile');
        }
      } else {
        Alert.alert('Error', err.response?.data?.error || 'Failed to save profile');
      }
    }
    setSaving(false);
  };

  const fields = [
    { key: 'gymName', icon: 'fitness', placeholder: 'Gym Name *', required: true },
    { key: 'address', icon: 'location', placeholder: 'Full Address *', required: true, multiline: true },
    { key: 'city', icon: 'business', placeholder: 'City *', required: true },
    { key: 'phone', icon: 'call', placeholder: 'Contact Phone *', required: true, keyboard: 'phone-pad' },
    { key: 'openingHours', icon: 'time', placeholder: 'Opening Hours (e.g. 6 AM – 10 PM) *', required: true },
    { key: 'mapLink', icon: 'map', placeholder: 'Google Maps Link (optional)' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Ionicons name="fitness" size={32} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Set Up Your Gym</Text>
        <Text style={styles.subtitle}>
          Complete your gym profile to get started. This helps your members and team know about your gym.
        </Text>
      </View>

      {/* Progress indicator */}
      <View style={styles.progressSection}>
        <View style={styles.progressDots}>
          <View style={[styles.dot, styles.dotDone]} /><View style={styles.dotLine} />
          <View style={[styles.dot, styles.dotDone]} /><View style={styles.dotLine} />
          <View style={[styles.dot, isValid ? styles.dotDone : styles.dotPending]} />
        </View>
        <Text style={styles.progressLabel}>
          {isValid ? '✓ All required fields filled' : 'Fill all required fields to continue'}
        </Text>
      </View>

      {/* Logo Upload */}
      <TouchableOpacity style={styles.logoWrap} onPress={pickLogo} activeOpacity={0.7}>
        {form.logo ? (
          <Image source={{ uri: form.logo }} style={styles.logo} />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Ionicons name="camera" size={28} color={Colors.primary} />
            <Text style={styles.logoText}>Upload Logo</Text>
            <Text style={styles.logoHint}>Optional</Text>
          </View>
        )}
        {form.logo ? (
          <TouchableOpacity style={styles.logoEditBadge} onPress={pickLogo}>
            <Ionicons name="pencil" size={14} color={Colors.background} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>

      {/* Form Fields */}
      {fields.map((field) => (
        <View key={field.key}>
          <View style={[
            styles.inputGroup,
            field.multiline && { height: 80, alignItems: 'flex-start', paddingTop: 14 },
            errors[field.key] && styles.inputError,
          ]}>
            <Ionicons
              name={field.icon}
              size={20}
              color={errors[field.key] ? Colors.expired : Colors.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, field.multiline && { textAlignVertical: 'top' }]}
              placeholder={field.placeholder}
              placeholderTextColor={Colors.placeholder}
              value={form[field.key]}
              onChangeText={(v) => updateField(field.key, v)}
              keyboardType={field.keyboard || 'default'}
              multiline={field.multiline}
            />
            {form[field.key]?.trim() && field.required && (
              <Ionicons name="checkmark-circle" size={18} color={Colors.active} />
            )}
          </View>
          {errors[field.key] && (
            <Text style={styles.errorText}>{errors[field.key]}</Text>
          )}
        </View>
      ))}

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveBtn, (!isValid || saving) && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={20} color={isValid ? Colors.background : Colors.textMuted} />
            <Text style={[styles.saveBtnText, !isValid && { color: Colors.textMuted }]}>
              Complete Setup & Continue
            </Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.footerNote}>
        You can update this information later from Settings
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingTop: 20, paddingBottom: 40 },

  header: { alignItems: 'center', marginBottom: 24 },
  headerIconWrap: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: Colors.primaryGlow,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 },

  progressSection: { alignItems: 'center', marginBottom: 24 },
  progressDots: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.border },
  dotDone: { backgroundColor: Colors.active },
  dotPending: { backgroundColor: Colors.expiringSoon },
  dotLine: { width: 24, height: 2, backgroundColor: Colors.border, marginHorizontal: 4 },
  progressLabel: { fontSize: 12, color: Colors.textMuted },

  logoWrap: { alignSelf: 'center', marginBottom: 24, position: 'relative' },
  logo: { width: 100, height: 100, borderRadius: 28, borderWidth: 3, borderColor: Colors.primary },
  logoPlaceholder: {
    width: 100, height: 100, borderRadius: 28, backgroundColor: Colors.card,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2,
    borderColor: Colors.primary + '40', borderStyle: 'dashed',
  },
  logoText: { fontSize: 11, color: Colors.primary, fontWeight: '600', marginTop: 4 },
  logoHint: { fontSize: 10, color: Colors.textMuted },
  logoEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },

  inputGroup: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg,
    borderRadius: 14, paddingHorizontal: 14, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.inputBorder, height: 54,
  },
  inputError: { borderColor: Colors.expired },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: Colors.text },
  errorText: { fontSize: 12, color: Colors.expired, marginTop: -8, marginBottom: 8, marginLeft: 14 },

  saveBtn: {
    backgroundColor: Colors.primary, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 16,
  },
  saveBtnDisabled: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: Colors.background },

  footerNote: {
    fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: 16,
  },
});

export default GymProfileSetupScreen;
