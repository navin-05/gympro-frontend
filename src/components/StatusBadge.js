import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../theme/colors';

const StatusBadge = ({ status }) => {
  const getColors = () => {
    switch (status) {
      case 'Active':
        return { bg: Colors.activeBg, text: Colors.active, border: Colors.active + '40' };
      case 'Expiring Soon':
        return { bg: Colors.expiringSoonBg, text: Colors.expiringSoon, border: Colors.expiringSoon + '40' };
      case 'Expired':
        return { bg: Colors.expiredBg, text: Colors.expired, border: Colors.expired + '40' };
      default:
        return { bg: Colors.activeBg, text: Colors.active, border: Colors.active + '40' };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={[styles.dot, { backgroundColor: colors.text }]} />
      <Text style={[styles.text, { color: colors.text }]}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});

export default StatusBadge;
