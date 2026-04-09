import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../theme/colors';
import { STATUS_LABELS } from '../constants';
import { formatDate, getPriority, isFollowUpDue } from '../utils';

const STATUS_THEME = {
  new: { text: Colors.info, bg: `${Colors.info}20` },
  'follow-up': { text: Colors.expiringSoon, bg: Colors.expiringSoonBg },
  joined: { text: Colors.active, bg: Colors.activeBg },
  'not-interested': { text: Colors.textMuted, bg: Colors.cardHover },
};

const PRIORITY_THEME = {
  HIGH: Colors.error,
  MEDIUM: Colors.warning,
  LOW: Colors.textMuted,
};

const EnquiryCard = ({ enquiry, onCallPress, onWhatsAppPress }) => {
  const statusTheme = STATUS_THEME[enquiry.status] || STATUS_THEME.new;
  const priority = getPriority(enquiry);
  const overdue = isFollowUpDue(enquiry);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{enquiry.name}</Text>
          <Text style={styles.phone}>{enquiry.phone}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <View style={[styles.statusBadge, { backgroundColor: statusTheme.bg }]}>
            <Text style={[styles.statusText, { color: statusTheme.text }]}>
              {STATUS_LABELS[enquiry.status] || 'New'}
            </Text>
          </View>
          <Text style={[styles.priority, { color: PRIORITY_THEME[priority] || Colors.warning }]}>
            {priority}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={15} color={Colors.textMuted} />
        <Text style={styles.metaText}>{formatDate(enquiry.createdAt)}</Text>
      </View>

      {!!enquiry.notes && <Text style={styles.notes}>{enquiry.notes}</Text>}

      <View style={styles.tagsWrap}>
        {(enquiry.tags || []).map((tag) => (
          <View key={`${enquiry.id}-${tag}`} style={styles.tagChip}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="time-outline" size={15} color={overdue ? Colors.error : Colors.textMuted} />
        <Text style={[styles.metaText, overdue && { color: Colors.error, fontWeight: '700' }]}>
          Next Follow-up: {formatDate(enquiry.nextFollowUp)}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionBtn, styles.callBtn]} onPress={() => onCallPress(enquiry)}>
          <Ionicons name="call" size={16} color="#fff" />
          <Text style={styles.actionText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.waBtn]} onPress={() => onWhatsAppPress(enquiry)}>
          <Ionicons name="logo-whatsapp" size={16} color="#fff" />
          <Text style={styles.actionText}>WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  name: { color: Colors.text, fontSize: 17, fontWeight: '700' },
  phone: { color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  priority: { fontSize: 11, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: Colors.textSecondary, fontSize: 12 },
  notes: { color: Colors.text, fontSize: 13, lineHeight: 19 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
  },
  tagText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  callBtn: { backgroundColor: '#1E70FF' },
  waBtn: { backgroundColor: '#25D366' },
  actionText: { color: '#fff', fontWeight: '700' },
});

export default EnquiryCard;
