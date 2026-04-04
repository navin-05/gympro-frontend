import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../theme/colors';
import apiClient from '../api/client';

const QRScannerScreen = ({ navigation }) => {
  const [memberId, setMemberId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Note: On a real device, this would use expo-camera for QR scanning.
  // For web/dev, we provide a manual member ID input as a fallback.
  const handleCheckin = async (id) => {
    const checkId = id || memberId.trim();
    if (!checkId) {
      Alert.alert('Error', 'Please enter or scan a member ID');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await apiClient.post('/attendance/checkin', { memberId: checkId });
      setResult({ success: true, data: res.data });
      setMemberId('');
    } catch (err) {
      const errorData = err.response?.data;
      setResult({
        success: false,
        message: errorData?.message || errorData?.error || 'Check-in failed',
      });
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>QR Check-in</Text>
        <Text style={styles.subtitle}>Scan member QR code or enter ID</Text>
      </View>

      {/* Scanner Area Placeholder */}
      <View style={styles.scannerArea}>
        <View style={styles.scannerFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
          <Ionicons name="qr-code" size={64} color={Colors.primary + '40'} />
          <Text style={styles.scannerText}>
            Camera QR scanning available on device
          </Text>
        </View>
      </View>

      {/* Manual Input */}
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
            />
          </View>
          <TouchableOpacity
            style={[styles.checkinBtn, loading && { opacity: 0.7 }]}
            onPress={() => handleCheckin()}
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

      {/* Result */}
      {result && (
        <View style={[styles.resultCard, result.success ? styles.resultSuccess : styles.resultError]}>
          <Ionicons
            name={result.success ? 'checkmark-circle' : 'close-circle'}
            size={40}
            color={result.success ? Colors.active : Colors.expired}
          />
          <Text style={styles.resultTitle}>
            {result.success ? 'Check-in Successful!' : 'Check-in Failed'}
          </Text>
          <Text style={styles.resultMessage}>
            {result.success ? result.data.message : result.message}
          </Text>
          {result.success && (
            <Text style={styles.resultTime}>
              {new Date(result.data.checkInTime).toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit',
              })}
            </Text>
          )}
        </View>
      )}

      {/* Today's Check-ins button */}
      <TouchableOpacity
        style={styles.historyBtn}
        onPress={() => navigation.navigate('Dashboard')}
      >
        <Ionicons name="list-outline" size={18} color={Colors.primary} />
        <Text style={styles.historyText}>View Today's Attendance</Text>
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
  },
  corner: {
    position: 'absolute', width: 30, height: 30,
    borderColor: Colors.primary, borderWidth: 3,
  },
  topLeft: { top: -1, left: -1, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 20 },
  topRight: { top: -1, right: -1, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 20 },
  bottomLeft: { bottom: -1, left: -1, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 20 },
  bottomRight: { bottom: -1, right: -1, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 20 },
  scannerText: { fontSize: 12, color: Colors.textMuted, marginTop: 12, textAlign: 'center', paddingHorizontal: 20 },
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
