import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../theme/colors';
import StatusBadge from './StatusBadge';

const MemberCard = ({ member, onPress }) => {
  const getStatusColor = () => {
    if (member.status === 'Active') return Colors.active;
    if (member.status === 'Expiring Soon') return Colors.expiringSoon;
    return Colors.expired;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: getStatusColor(), borderLeftWidth: 3 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <View style={styles.avatarWrap}>
          {member.photo ? (
            <Image source={{ uri: member.photo }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {member.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{member.name}</Text>
          <Text style={styles.plan} numberOfLines={1}>
            {member.planName || 'No Plan'}
          </Text>
          <Text style={styles.expiry}>
            Expires: {formatDate(member.expiryDate)}
          </Text>
        </View>
        <View style={styles.right}>
          <StatusBadge status={member.status} />
          {member.dueAmount > 0 && (
            <Text style={styles.due}>₹{member.dueAmount} due</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  plan: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  expiry: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  right: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  due: {
    fontSize: 11,
    color: Colors.expired,
    fontWeight: '600',
    marginTop: 6,
  },
});

export default MemberCard;
