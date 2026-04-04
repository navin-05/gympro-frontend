import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../theme/colors';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

const GymProfileScreen = () => {
  const { logout } = useAuth();
  const [form, setForm] = useState({
    gymName: '', address: '', city: '', phone: '', mapLink: '', openingHours: '', logo: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  useFocusEffect(useCallback(() => {
    loadProfile();
  }, []));

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/gym/profile');
      if (res.data) {
        setForm({
          gymName: res.data.gymName || '',
          address: res.data.address || '',
          city: res.data.city || '',
          phone: res.data.phone || '',
          mapLink: res.data.mapLink || '',
          openingHours: res.data.openingHours || '',
          logo: res.data.logo || '',
        });
        setHasProfile(true);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
          // Alert.alert doesn't work on web, use window.confirm as fallback
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
