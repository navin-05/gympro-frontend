import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../theme/colors';

const StatCard = ({ icon, label, value, color = Colors.primary, small = false, onPress }) => {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={[styles.card, small && styles.cardSmall]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={small ? 20 : 24} color={color} />
      </View>
      <Text style={[styles.value, small && styles.valueSmall, { color }]}>
        {value}
      </Text>
      <Text style={[styles.label, small && styles.labelSmall]} numberOfLines={1}>
        {label}
      </Text>
      {onPress && (
        <View style={styles.tapHint}>
          <Ionicons name="chevron-forward" size={12} color={Colors.textMuted} />
        </View>
      )}
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    minWidth: '47%',
    maxWidth: '47%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardSmall: {
    padding: 12,
    minWidth: '30%',
    maxWidth: '31%',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  value: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
  },
  valueSmall: {
    fontSize: 20,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  labelSmall: {
    fontSize: 11,
  },
  tapHint: {
    position: 'absolute', top: 14, right: 14,
  },
});

export default StatCard;
