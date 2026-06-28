import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export function SignUpScreen({ onNavigateToLogin }: { onNavigateToLogin: () => void }) {
  const { theme } = useTheme();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async () => {
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const result = await signup(name.trim(), email.trim(), password);
    setLoading(false);
    if (!result.ok) setError(result.error || 'Sign up failed.');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.pageBg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={[styles.logoIcon, { backgroundColor: theme.brownBg, borderColor: theme.border }]}>
            <Text style={{ fontSize: 26 }}>⊞</Text>
          </View>
          <Text style={[styles.title, { color: theme.dark }]}>Create account</Text>
          <Text style={[styles.sub, { color: theme.muted }]}>Start designing beautiful floor plans</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: theme.errorBg, borderColor: theme.errorBorder }]}>
              <Text style={[styles.errorText, { color: theme.errorText }]}>{error}</Text>
            </View>
          ) : null}
          <Input label="Full name" value={name} onChangeText={setName} placeholder="Jane Doe" containerStyle={styles.gap} />
          <Input label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" containerStyle={styles.gap} />
          <Input label="Password" value={password} onChangeText={setPassword} placeholder="Min. 6 characters" secureTextEntry containerStyle={styles.gap} />
          <Input label="Confirm password" value={confirm} onChangeText={setConfirm} placeholder="••••••••" secureTextEntry containerStyle={styles.gap} />
          <Button label="Create Account" onPress={handleSignUp} loading={loading} style={{ marginTop: 6 }} />
        </View>

        <View style={styles.switchRow}>
          <Text style={[styles.switchText, { color: theme.muted }]}>Already have an account? </Text>
          <TouchableOpacity onPress={onNavigateToLogin}>
            <Text style={[styles.switchLink, { color: theme.brown }]}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 28 },
  logoIcon: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 20 },
  title: { fontFamily: 'Merriweather_700Bold', fontSize: 28, textAlign: 'center', marginBottom: 8 },
  sub: { fontSize: 14, fontWeight: '300', textAlign: 'center' },
  card: { borderWidth: 1, borderRadius: 16, padding: 24, marginBottom: 16 },
  errorBox: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13, lineHeight: 18 },
  gap: { marginBottom: 14 },
  switchRow: { flexDirection: 'row', justifyContent: 'center' },
  switchText: { fontSize: 13 },
  switchLink: { fontSize: 13, fontWeight: '600' },
});
