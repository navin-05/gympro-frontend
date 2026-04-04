import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Returns a consistent top padding value that accounts for:
 * - Native status bar (iOS/Android safe area inset)
 * - Web needs no status bar inset
 * - Minimum visual breathing room (16px)
 */
export const useTopPadding = () => {
  const insets = useSafeAreaInsets();
  // On web, insets.top is 0 — just use minimal padding
  // On native, use inset + small breathing room
  if (Platform.OS === 'web') return 16;
  return Math.max(insets.top, 20) + 8;
};
