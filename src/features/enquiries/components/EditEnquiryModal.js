import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../theme/colors';
import { DEFAULT_TAG_OPTIONS, ENQUIRY_STATUS, STATUS_LABELS } from '../constants';

const emptyForm = {
  name: '',
  phone: '',
  notes: '',
  status: 'new',
  tags: [],
  nextFollowUp: '',
};

const EditEnquiryModal = ({
  visible,
  onClose,
  onSubmit,
  enquiry,
  tagOptions = DEFAULT_TAG_OPTIONS,
}) => {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible || !enquiry) return;
    setForm({
      name: enquiry.name || '',
      phone: enquiry.phone || '',
      notes: enquiry.notes || '',
      status: enquiry.status || 'new',
      tags: Array.isArray(enquiry.tags) ? enquiry.tags : [],
      nextFollowUp: enquiry.nextFollowUp ? String(enquiry.nextFollowUp).slice(0, 10) : '',
    });
    setError('');
  }, [visible, enquiry]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleTag = (tag) => {
    setForm((prev) => {
      const exists = prev.tags.includes(tag);
      return {
        ...prev,
        tags: exists ? prev.tags.filter((item) => item !== tag) : [...prev.tags, tag],
      };
    });
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Name and phone are required.');
      return;
    }
    const ok = await onSubmit(form);
    if (ok) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit Enquiry</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor={Colors.placeholder}
              value={form.name}
              onChangeText={(v) => setField('name', v)}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone (international, e.g. 919876543210)"
              placeholderTextColor={Colors.placeholder}
              value={form.phone}
              keyboardType="phone-pad"
              onChangeText={(v) => setField('phone', v)}
            />
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Notes"
              placeholderTextColor={Colors.placeholder}
              value={form.notes}
              multiline
              onChangeText={(v) => setField('notes', v)}
            />

            <Text style={styles.sectionLabel}>Status</Text>
            <View style={styles.chipsWrap}>
              {ENQUIRY_STATUS.map((status) => {
                const selected = form.status === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setField('status', status)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {STATUS_LABELS[status]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>Tags</Text>
            <View style={styles.chipsWrap}>
              {tagOptions.map((tag) => {
                const selected = form.tags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>Next Follow-up (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={form.nextFollowUp}
              placeholder="2026-04-10"
              placeholderTextColor={Colors.placeholder}
              onChangeText={(v) => setField('nextFollowUp', v)}
            />

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Ionicons name="save-outline" size={18} color={Colors.background} />
              <Text style={styles.submitText}>Save Changes</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    borderColor: Colors.border,
    borderTopWidth: 1,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.card,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderColor: Colors.inputBorder,
    borderWidth: 1,
    color: Colors.text,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
    marginBottom: 10,
  },
  notesInput: {
    minHeight: 90,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  sectionLabel: { color: Colors.textSecondary, marginTop: 4, marginBottom: 8, fontWeight: '600' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  chipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryGlow },
  chipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextSelected: { color: Colors.primary },
  errorText: { color: Colors.error, marginBottom: 10, fontWeight: '600' },
  submitBtn: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  submitText: { color: Colors.background, fontWeight: '700' },
});

export default EditEnquiryModal;
