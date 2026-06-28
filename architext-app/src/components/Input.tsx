import React from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface Props extends TextInputProps {
  label?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, containerStyle, style, ...rest }: Props) {
  const { theme } = useTheme();
  return (
    <View style={containerStyle}>
      {label ? <Text style={[styles.label, { color: theme.mid }]}>{label}</Text> : null}
      <TextInput
        style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.dark }, style]}
        placeholderTextColor={theme.muted}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '500', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 9, paddingVertical: 11, paddingHorizontal: 14, fontSize: 14 },
});
