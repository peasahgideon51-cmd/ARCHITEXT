import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', loading, disabled, style }: Props) {
  const { theme } = useTheme();
  const bg = variant === 'primary' ? theme.brown : variant === 'secondary' ? theme.brownBg : 'transparent';
  const tc = variant === 'primary' ? '#fff' : variant === 'secondary' ? theme.brownDark : theme.brown;
  const bc = variant === 'ghost' ? theme.brown : 'transparent';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[styles.btn, { backgroundColor: bg, borderColor: bc, borderWidth: variant === 'ghost' ? 1.5 : 0, opacity: disabled ? 0.55 : 1 }, style]}
    >
      {loading
        ? <ActivityIndicator color={tc} size="small" />
        : <Text style={[styles.label, { color: tc }]}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: 10, paddingVertical: 13, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, fontWeight: '600' },
});
