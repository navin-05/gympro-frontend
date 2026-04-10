import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Modal, TextInput, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import Colors from '../theme/colors';
import apiClient from '../api/client';
import PlanCard from '../components/PlanCard';

const PlansScreen = () => {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState({ planName: '', durationDays: '', price: '' });

  const plansQuery = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await apiClient.get('/plans');
      return res.data || [];
    },
  });

  useFocusEffect(useCallback(() => {
    plansQuery.refetch();
  }, []));

  const plans = Array.isArray(plansQuery.data) ? plansQuery.data : [];

  const savePlanMutation = useMutation({
    mutationFn: async ({ data, planId }) => {
      if (planId) {
        const res = await apiClient.put(`/plans/${planId}`, data);
        return res.data;
      }
      const res = await apiClient.post('/plans', data);
      return res.data;
    },
    onSuccess: () => {
      setModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: (err) => {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save plan');
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id) => {
      return await apiClient.delete(`/plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      Toast.show({
        type: 'success',
        text1: 'Plan Deleted',
      });
    },
    onError: (err) => {
      console.log('[Plans] Delete error:', err?.response?.status, err?.response?.data || err?.message);
      Toast.show({
        type: 'error',
        text1: 'Delete Failed',
      });
    },
  });

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
    const data = {
      planName: form.planName,
      durationDays: parseInt(form.durationDays),
      price: parseFloat(form.price),
    };
    savePlanMutation.mutate({ data, planId: editingPlan?._id });
  };

  const handleDelete = (id) => {
    console.log('[Plans] DELETE HANDLER TRIGGERED', id);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm('Delete this plan?');
      if (!confirmed) return;
      console.log('[Plans] DELETE CLICKED', id);
      deletePlanMutation.mutate(id);
      return;
    }

    Alert.alert('Delete Plan', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          console.log('[Plans] DELETE CLICKED', id);
          deletePlanMutation.mutate(id);
        },
      },
    ]);
  };

  if (plansQuery.isLoading) {
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
              style={[styles.saveBtn, savePlanMutation.isPending && { opacity: 0.7 }]}
              onPress={handleSave} disabled={savePlanMutation.isPending}
            >
              {savePlanMutation.isPending ? (
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
