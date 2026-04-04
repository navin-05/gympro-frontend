import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../theme/colors';
import apiClient from '../api/client';
import PlanCard from '../components/PlanCard';

const PlansScreen = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState({ planName: '', durationDays: '', price: '' });
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { fetchPlans(); }, []));

  const fetchPlans = async () => {
    try {
      const res = await apiClient.get('/plans');
      setPlans(res.data);
    } catch (err) {
      console.log('Plans error:', err.message);
    }
    setLoading(false);
  };

  const openAdd = () => {
    setEditingPlan(null);
    setForm({ planName: '', durationDays: '', price: '' });
    setModalVisible(true);
  };

  const openEdit = (plan) => {
    setEditingPlan(plan);
    setForm({
      planName: plan.planName,
      durationDays: String(plan.durationDays),
      price: String(plan.price),
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.planName || !form.durationDays || !form.price) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setSaving(true);
    try {
      const data = {
        planName: form.planName,
        durationDays: parseInt(form.durationDays),
        price: parseFloat(form.price),
      };
      if (editingPlan) {
        await apiClient.put(`/plans/${editingPlan._id}`, data);
      } else {
        await apiClient.post('/plans', data);
      }
      setModalVisible(false);
      fetchPlans();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save plan');
    }
    setSaving(false);
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Plan', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/plans/${id}`);
            fetchPlans();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete plan');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Membership Plans</Text>
          <Text style={styles.subtitle}>{plans.length} plan(s)</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={24} color={Colors.background} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={plans}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <PlanCard plan={item} onEdit={openEdit} onDelete={handleDelete} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="ribbon-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No plans yet</Text>
            <Text style={styles.emptyHint}>Tap + to add your first plan</Text>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPlan ? 'Edit Plan' : 'New Plan'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input} placeholder="Plan Name (e.g. Monthly)"
                placeholderTextColor={Colors.placeholder}
                value={form.planName} onChangeText={(v) => setForm({ ...form, planName: v })}
              />
            </View>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input} placeholder="Duration (days)"
                placeholderTextColor={Colors.placeholder} keyboardType="numeric"
                value={form.durationDays} onChangeText={(v) => setForm({ ...form, durationDays: v })}
              />
            </View>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input} placeholder="Price (₹)"
                placeholderTextColor={Colors.placeholder} keyboardType="numeric"
                value={form.price} onChangeText={(v) => setForm({ ...form, price: v })}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave} disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <Text style={styles.saveBtnText}>
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  addBtn: {
    width: 48, height: 48, borderRadius: 16, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: Colors.textSecondary, marginTop: 12 },
  emptyHint: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },
  modalOverlay: {
    flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: Colors.border,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  inputGroup: {
    backgroundColor: Colors.inputBg, borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.inputBorder, height: 52, justifyContent: 'center', paddingHorizontal: 14,
  },
  input: { fontSize: 16, color: Colors.text },
  saveBtn: {
    backgroundColor: Colors.primary, height: 52, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: Colors.background },
});

export default PlansScreen;
