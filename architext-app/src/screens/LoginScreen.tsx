import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Input } from "../components/Input";
import { Button } from "../components/Button";

interface Props {
  onNavigateToSignUp: () => void;
  onSkip: () => void;
}

export function LoginScreen({ onNavigateToSignUp, onSkip }: Props) {
  const { theme } = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (!result.ok) setError(result.error || "Login failed.");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.pageBg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View
            style={[
              styles.logoIcon,
              { backgroundColor: theme.brownBg, borderColor: theme.border },
            ]}
          >
            <Text style={{ fontSize: 26 }}>⊞</Text>
          </View>
          <Text style={[styles.title, { color: theme.dark }]}>
            Welcome back
          </Text>
          <Text style={[styles.sub, { color: theme.muted }]}>
            Sign in to access your floor plans
          </Text>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.cardBg, borderColor: theme.border },
          ]}
        >
          {error ? (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: theme.errorBg,
                  borderColor: theme.errorBorder,
                },
              ]}
            >
              <Text style={[styles.errorText, { color: theme.errorText }]}>
                {error}
              </Text>
            </View>
          ) : null}
          <Input
            label="Email address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            containerStyle={styles.gap}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            containerStyle={styles.gap}
          />
          <Button
            label="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: 6 }}
          />
          <TouchableOpacity
            style={styles.forgotRow}
            onPress={() =>
              Alert.alert(
                "Coming soon",
                "Password reset isn't available yet. Please contact support if you're locked out.",
              )
            }
          >
            <Text style={[styles.forgotText, { color: theme.brown }]}>
              Forgot password?
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.switchRow}>
          <Text style={[styles.switchText, { color: theme.muted }]}>
            Don't have an account?{" "}
          </Text>
          <TouchableOpacity onPress={onNavigateToSignUp}>
            <Text style={[styles.switchLink, { color: theme.brown }]}>
              Sign up
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: theme.muted }]}>
            Continue without signing in →
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: { alignItems: "center", marginBottom: 28 },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 20,
  },
  title: {
    fontFamily: "Merriweather_700Bold",
    fontSize: 28,
    textAlign: "center",
    marginBottom: 8,
  },
  sub: { fontSize: 14, fontWeight: "300", textAlign: "center" },
  card: { borderWidth: 1, borderRadius: 16, padding: 24, marginBottom: 16 },
  errorBox: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13, lineHeight: 18 },
  gap: { marginBottom: 14 },
  forgotRow: { alignItems: "center", marginTop: 14 },
  forgotText: { fontSize: 13 },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
  },
  switchText: { fontSize: 13 },
  switchLink: { fontSize: 13, fontWeight: "600" },
  skipBtn: { alignItems: "center", paddingVertical: 10 },
  skipText: { fontSize: 12 },
});
