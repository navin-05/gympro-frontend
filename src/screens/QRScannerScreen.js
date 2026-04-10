import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Colors from '../theme/colors';
import apiClient from '../api/client';

const COOLDOWN_MS = 3500;

const QRScannerScreen = ({ navigation }) => {
  const [memberId, setMemberId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [permission, requestPermission] = useCameraPermissions();

  const inFlightRef = useRef(false);
  const lastAttemptRef = useRef({ id: '', at: 0 });
  const lastBarcodeRef = useRef({ data: '', at: 0 });

  useEffect(() => {
    if (Platform.OS === 'web') return;
    requestPermission();
    // One-time camera permission prompt on native
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestCheckIn = useCallback(async (rawId) => {
    const checkId = String(rawId !== undefined && rawId !== null ? rawId : memberId).trim();
    if (!checkId) {
      Alert.alert('Error', 'Please enter or scan a member ID');
      return;
    }

    const now = Date.now();
    if (inFlightRef.current) return;

    if (lastAttemptRef.current.id === checkId && now - lastAttemptRef.current.at < COOLDOWN_MS) {
      return;
    }

    inFlightRef.current = true;
    lastAttemptRef.current = { id: checkId, at: now };
    setLoading(true);
    setResult(null);

    try {
      const res = await apiClient.post('/attendance/checkin', { memberId: checkId });
      const data = res.data || {};
      setResult({
        success: true,
        data,
        repeat: !!data.alreadyCheckedIn,
      });
      setMemberId('');
    } catch (err) {
      const errorData = err.response?.data;
      setResult({
        success: false,
        message: errorData?.message || errorData?.error || 'Check-in failed',
      });
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [memberId]);

  const onBarcodeScanned = useCallback(
    (event) => {
      if (loading || inFlightRef.current) return;
      const payload = event?.nativeEvent ?? event;
      const data = payload?.data ? String(payload.data).trim() : '';
      if (!data) return;

      const t = Date.now();
      if (lastBarcodeRef.current.data === data && t - lastBarcodeRef.current.at < COOLDOWN_MS) {
        return;
      }
      lastBarcodeRef.current = { data, at: t };

      requestCheckIn(data);
    },
    [loading, requestCheckIn]
  );

  const onPressCheckIn = useCallback(() => {
    requestCheckIn();
  }, [requestCheckIn]);

  const showNativeScanner = Platform.OS !== 'web' && permission?.granted;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>QR Check-in</Text>
        <Text style={styles.subtitle}>Scan member QR code or enter ID</Text>
      </View>

      <View style={styles.scannerArea}>
        <View style={styles.scannerFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
          {showNativeScanner ? (
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerEnabled={!loading}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={onBarcodeScanned}
            />
          ) : (
            <>
              <Ionicons name="qr-code" size={64} color={Colors.primary + '40'} />
              <Text style={styles.scannerText}>
                {Platform.OS === 'web'
                  ? 'Enter member ID below, or use the app on a device with a camera.'
                  : permission?.granted === false
                    ? 'Camera permission is required to scan QR codes.'
                    : 'Preparing camera…'}
              </Text>
              {Platform.OS !== 'web' && permission && !permission.granted ? (
                <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                  <Text style={styles.permBtnText}>Allow camera</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </View>
      </View>

      <View style={styles.manualSection}>
        <Text style={styles.manualLabel}>Or enter Member ID manually</Text>
        <View style={styles.inputRow}>
          <View style={styles.inputWrap}>
            <Ionicons name="id-card-outline" size={20} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Member ID"
              placeholderTextColor={Colors.placeholder}
              value={memberId}
              onChangeText={setMemberId}
              autoCapitalize="none"
              editable={!loading}
              onSubmitEditing={onPressCheckIn}
              returnKeyType="done"
            />
          </View>
          <TouchableOpacity
            style={[styles.checkinBtn, loading && { opacity: 0.7 }]}
            onPress={onPressCheckIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.background} size="small" />
            ) : (
              <Ionicons name="checkmark" size={24} color={Colors.background} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {result && (
        <View style={[styles.resultCard, result.success ? styles.resultSuccess : styles.resultError]}>
          <Ionicons
            name={result.success ? 'checkmark-circle' : 'close-circle'}
            size={40}
            color={result.success ? Colors.active : Colors.expired}
          />
          <Text style={styles.resultTitle}>
            {result.success ? (result.repeat ? 'Already checked in' : 'Check-in Successful!') : 'Check-in Failed'}
          </Text>
          <Text style={styles.resultMessage}>
            {result.success ? result.data.message : result.message}
          </Text>
          {result.success && result.data.checkInTime && (
            <Text style={styles.resultTime}>
              {new Date(result.data.checkInTime).toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit',
              })}
            </Text>
          )}
        </View>
      )}

      <TouchableOpacity
        style={styles.historyBtn}
        onPress={() => navigation.navigate('Dashboard')}
      >
        <Ionicons name="list-outline" size={18} color={Colors.primary} />
        <Text style={styles.historyText}>{"View Today's Attendance"}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20, paddingTop: 20 },
  header: { marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  scannerArea: { alignItems: 'center', marginBottom: 24 },
  scannerFrame: {
    width: 220, height: 220, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.card, borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  camera: { width: '100%', height: '100%' },
  corner: {
    position: 'absolute', width: 30, height: 30,
    borderColor: Colors.primary, borderWidth: 3, zIndex: 2,
  },
  topLeft: { top: -1, left: -1, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 20 },
  topRight: { top: -1, right: -1, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 20 },
  bottomLeft: { bottom: -1, left: -1, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 20 },
  bottomRight: { bottom: -1, right: -1, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 20 },
  scannerText: { fontSize: 12, color: Colors.textMuted, marginTop: 12, textAlign: 'center', paddingHorizontal: 20 },
  permBtn: {
    marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.primary,
  },
  permBtnText: { color: Colors.background, fontWeight: '600', fontSize: 14 },
  manualSection: { marginBottom: 20 },
  manualLabel: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8 },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg,
    borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.inputBorder, height: 52, gap: 8,
  },
  input: { flex: 1, fontSize: 16, color: Colors.text },
  checkinBtn: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  resultCard: {
    borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20,
    borderWidth: 1,
  },
  resultSuccess: { backgroundColor: Colors.activeBg, borderColor: Colors.active + '30' },
  resultError: { backgroundColor: Colors.expiredBg, borderColor: Colors.expired + '30' },
  resultTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginTop: 8 },
  resultMessage: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
  resultTime: { fontSize: 16, fontWeight: '600', color: Colors.primary, marginTop: 8 },
  historyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14,
  },
  historyText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
});

export default QRScannerScreen;
