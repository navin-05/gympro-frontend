import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../theme/colors';
import apiClient from '../api/client';

const PaymentScreen = ({ route, navigation }) => {
  const { memberId } = route.params;
  const [payment, setPayment] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { fetchPayment(); }, []));

  const fetchPayment = async () => {
    try {
      const res = await apiClient.get(`/payments/${memberId}`);
      setPayment(res.data);
    } catch (err) {
      console.log('Payment error:', err.message);
    }
    setLoading(false);
  };

  const handlePayment = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      const res = await apiClient.put(`/payments/${memberId}`, { amount: amt });
      setPayment(res.data);
      setAmount('');
      Alert.alert('Success', res.data.message);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Payment failed');
    }
    setSaving(false);
  };

  if (loading || !payment) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.memberName}>{payment.memberName}</Text>
      <Text style={styles.planName}>{payment.planName}</Text>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Price</Text>
          <Text style={styles.summaryValue}>₹{payment.totalPrice}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Paid</Text>
          <Text style={[styles.summaryValue, { color: Colors.active }]}>₹{payment.paidAmount}</Text>
        </View>
        <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.summaryLabel}>Due</Text>
          <Text style={[styles.summaryValue, { color: payment.dueAmount > 0 ? Colors.expired : Colors.active }]}>
            ₹{payment.dueAmount}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressWrap}>
        <View style={styles.progressBg}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(100, (payment.paidAmount / payment.totalPrice) * 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round((payment.paidAmount / payment.totalPrice) * 100)}% paid
        </Text>
      </View>

      {/* Record Payment */}
      {payment.dueAmount > 0 && (
        <View style={styles.paySection}>
          <Text style={styles.sectionTitle}>Record Payment</Text>
          <View style={styles.payRow}>
            <View style={styles.amountInputWrap}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="Amount"
                placeholderTextColor={Colors.placeholder}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
            </View>
            <TouchableOpacity
              style={[styles.payBtn, saving && { opacity: 0.7 }]}
              onPress={handlePayment} disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.background} size="small" />
              ) : (
                <Text style={styles.payBtnText}>Pay</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick amounts */}
          <View style={styles.quickAmounts}>
            {[500, 1000, 2000, payment.dueAmount].map((amt, i) => (
              <TouchableOpacity
                key={i}
                style={styles.quickBtn}
                onPress={() => setAmount(String(amt))}
              >
                <Text style={styles.quickText}>₹{amt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {payment.dueAmount === 0 && (
        <View style={styles.paidBanner}>
          <Ionicons name="checkmark-circle" size={40} color={Colors.active} />
          <Text style={styles.paidBannerText}>All dues cleared!</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.card,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
  memberName: { fontSize: 24, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  planName: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  summaryCard: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  summaryLabel: { fontSize: 15, color: Colors.textSecondary },
  summaryValue: { fontSize: 18, fontWeight: '700', color: Colors.text },
  progressWrap: { marginBottom: 24 },
  progressBg: { height: 8, backgroundColor: Colors.card, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  progressText: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginTop: 4 },
  paySection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  payRow: { flexDirection: 'row', gap: 10 },
  amountInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg,
    borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.inputBorder, height: 52,
  },
  rupee: { fontSize: 18, color: Colors.textMuted, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 18, color: Colors.text, fontWeight: '600' },
  payBtn: {
    backgroundColor: Colors.primary, width: 80, height: 52, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  payBtnText: { fontSize: 16, fontWeight: '700', color: Colors.background },
  quickAmounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  quickBtn: {
    backgroundColor: Colors.card, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
  },
  quickText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  paidBanner: {
    alignItems: 'center', paddingVertical: 30, backgroundColor: Colors.activeBg,
    borderRadius: 16, marginTop: 10,
  },
  paidBannerText: { fontSize: 18, fontWeight: '600', color: Colors.active, marginTop: 8 },
});

export default PaymentScreen;
