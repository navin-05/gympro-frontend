import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Modal, TextInput, Alert, ActivityIndicator, Image, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../theme/colors';
import apiClient from '../api/client';

const TransformationScreen = () => {
  const [transformations, setTransformations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ memberName: '', beforePhoto: '', afterPhoto: '', duration: '' });
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { fetchTransformations(); }, []));

  const fetchTransformations = async () => {
    try {
      const res = await apiClient.get('/transformations');
      setTransformations(res.data);
    } catch (err) {
      console.log('Transformations error:', err.message);
    }
    setLoading(false);
  };

  const pickImage = async (field) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setForm({ ...form, [field]: `data:image/jpeg;base64,${result.assets[0].base64}` });
    }
  };

  const handleSave = async () => {
    if (!form.memberName || !form.beforePhoto || !form.afterPhoto || !form.duration) {
      Alert.alert('Error', 'Please fill all fields and add both photos');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/transformations', form);
      setModalVisible(false);
      setForm({ memberName: '', beforePhoto: '', afterPhoto: '', duration: '' });
      fetchTransformations();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save');
    }
    setSaving(false);
  };

  const handleDelete = (id) => {
    Alert.alert('Delete', 'Remove this transformation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/transformations/${id}`);
            fetchTransformations();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardName}>{item.memberName}</Text>
        <TouchableOpacity onPress={() => handleDelete(item._id)}>
          <Ionicons name="trash-outline" size={18} color={Colors.expired} />
        </TouchableOpacity>
      </View>
      <View style={styles.photosRow}>
        <View style={styles.photoCol}>
          <Text style={styles.photoLabel}>Before</Text>
          {item.beforePhoto ? (
            <Image source={{ uri: item.beforePhoto }} style={styles.transformPhoto} />
          ) : (
            <View style={styles.photoPlaceholder}><Ionicons name="image-outline" size={24} color={Colors.textMuted} /></View>
          )}
        </View>
        <View style={styles.arrowWrap}>
          <Ionicons name="arrow-forward" size={24} color={Colors.primary} />
        </View>
        <View style={styles.photoCol}>
          <Text style={styles.photoLabel}>After</Text>
          {item.afterPhoto ? (
            <Image source={{ uri: item.afterPhoto }} style={styles.transformPhoto} />
          ) : (
            <View style={styles.photoPlaceholder}><Ionicons name="image-outline" size={24} color={Colors.textMuted} /></View>
          )}
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.duration}>{item.duration}</Text>
      </View>
    </View>
  );

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
          <Text style={styles.title}>Transformations</Text>
          <Text style={styles.subtitle}>{transformations.length} result(s)</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={24} color={Colors.background} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={transformations}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="images-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No transformations yet</Text>
            <Text style={styles.emptyHint}>Showcase member results</Text>
          </View>
        }
      />

      {/* Upload Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Transformation</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input} placeholder="Member Name"
                placeholderTextColor={Colors.placeholder}
                value={form.memberName}
                onChangeText={(v) => setForm({ ...form, memberName: v })}
              />
            </View>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input} placeholder="Duration (e.g. 3 months)"
                placeholderTextColor={Colors.placeholder}
                value={form.duration}
                onChangeText={(v) => setForm({ ...form, duration: v })}
              />
            </View>

            <View style={styles.uploadRow}>
              <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage('beforePhoto')}>
                {form.beforePhoto ? (
                  <Image source={{ uri: form.beforePhoto }} style={styles.uploadImg} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={24} color={Colors.textMuted} />
                    <Text style={styles.uploadText}>Before</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage('afterPhoto')}>
                {form.afterPhoto ? (
                  <Image source={{ uri: form.afterPhoto }} style={styles.uploadImg} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={24} color={Colors.textMuted} />
                    <Text style={styles.uploadText}>After</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave} disabled={saving}
            >
              {saving ? <ActivityIndicator color={Colors.background} /> :
                <Text style={styles.saveBtnText}>Upload Transformation</Text>}
            </TouchableOpacity>
          </ScrollView>
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
  card: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  photosRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  photoCol: { flex: 1, alignItems: 'center' },
  photoLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 6, textTransform: 'uppercase', fontWeight: '600' },
  transformPhoto: { width: '100%', height: 160, borderRadius: 12 },
  photoPlaceholder: {
    width: '100%', height: 160, borderRadius: 12, backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  arrowWrap: { paddingHorizontal: 10 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  duration: { fontSize: 13, color: Colors.textSecondary },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: Colors.textSecondary, marginTop: 12 },
  emptyHint: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, maxHeight: '80%', borderWidth: 1, borderColor: Colors.border,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  inputGroup: {
    backgroundColor: Colors.inputBg, borderRadius: 12, height: 52, justifyContent: 'center',
    paddingHorizontal: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.inputBorder,
  },
  input: { fontSize: 16, color: Colors.text },
  uploadRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  uploadBtn: {
    flex: 1, height: 140, borderRadius: 14, backgroundColor: Colors.card,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2,
    borderColor: Colors.border, borderStyle: 'dashed', overflow: 'hidden',
  },
  uploadImg: { width: '100%', height: '100%' },
  uploadText: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  saveBtn: {
    backgroundColor: Colors.primary, height: 52, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: Colors.background },
});

export default TransformationScreen;
