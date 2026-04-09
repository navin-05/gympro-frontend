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

const QUICK_STATUS = ['new', 'follow-up', 'joined'];
const MENU_STATUS_OPTIONS = ['new', 'follow-up', 'joined', 'not-interested'];

const EnquiryCard = ({
  enquiry,
  onCallPress,
  onWhatsAppPress,
  onQuickStatusChange,
  onOpenMenu,
  onCloseMenu,
  onEditPress,
  onDeletePress,
  isMenuOpen,
}) => {
  const statusTheme = STATUS_THEME[enquiry.status] || STATUS_THEME.new;
  const priority = getPriority(enquiry);
  const overdue = isFollowUpDue(enquiry);
  const enquiryId = enquiry._id != null ? String(enquiry._id) : String(enquiry.id ?? '');

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{enquiry.name}</Text>
            <TouchableOpacity style={styles.inlineEditBtn} onPress={() => onEditPress(enquiry)}>
              <Ionicons name="create-outline" size={14} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.phone}>{enquiry.phone}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => onOpenMenu(enquiry._id != null ? String(enquiry._id) : enquiryId)}>
            <Ionicons name="ellipsis-vertical" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
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

      {isMenuOpen && (
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={() => { onCloseMenu(); onEditPress(enquiry); }}>
            <Text style={styles.menuText}>Edit Enquiry</Text>
          </TouchableOpacity>
          {MENU_STATUS_OPTIONS.map((status) => (
            <TouchableOpacity
              key={`${enquiryId}-menu-${status}`}
              style={styles.menuItem}
              onPress={() => {
                onCloseMenu();
                onQuickStatusChange(enquiry, status);
              }}
            >
              <Text style={styles.menuText}>Mark as {STATUS_LABELS[status]}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemDanger]}
            onPress={() => {
              onCloseMenu();
              if (enquiry._id == null) {
                console.log('[EnquiryCard] delete skipped: enquiry._id missing');
                return;
              }
              console.log('[EnquiryCard] delete menu:', String(enquiry._id));
              onDeletePress(String(enquiry._id));
            }}
          >
            <Text style={[styles.menuText, { color: Colors.error }]}>Delete Enquiry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={15} color={Colors.textMuted} />
        <Text style={styles.metaText}>{formatDate(enquiry.createdAt)}</Text>
      </View>

      {!!enquiry.notes && <Text style={styles.notes}>{enquiry.notes}</Text>}

      <View style={styles.tagsWrap}>
        {(enquiry.tags || []).map((tag) => (
          <View key={`${enquiry._id || enquiry.id}-${tag}`} style={styles.tagChip}>
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

      <View style={styles.quickStatusWrap}>
        {QUICK_STATUS.map((status) => {
          const active = enquiry.status === status;
          return (
            <TouchableOpacity
              key={`${enquiry._id || enquiry.id}-${status}`}
              style={[styles.quickChip, active && styles.quickChipActive]}
              onPress={() => onQuickStatusChange(enquiry, status)}
            >
              <Text style={[styles.quickChipText, active && styles.quickChipTextActive]}>
                {STATUS_LABELS[status]}
              </Text>
            </TouchableOpacity>
          );
        })}
        {enquiry.status === 'not-interested' && (
          <TouchableOpacity
            style={[styles.quickChip, styles.quickChipActive]}
            onPress={() => onQuickStatusChange(enquiry, 'not-interested')}
          >
            <Text style={[styles.quickChipText, styles.quickChipTextActive]}>
              {STATUS_LABELS['not-interested']}
            </Text>
          </TouchableOpacity>
        )}
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: Colors.text, fontSize: 17, fontWeight: '700' },
  inlineEditBtn: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phone: { color: Colors.textSecondary, marginTop: 2 },
  menuBtn: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  menu: {
    position: 'absolute',
    top: 42,
    right: 14,
    zIndex: 40,
    width: 190,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemDanger: { backgroundColor: `${Colors.error}12` },
  menuText: { color: Colors.text, fontSize: 13, fontWeight: '600' },
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
  quickStatusWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  quickChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  quickChipText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  quickChipTextActive: { color: Colors.primary },
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
