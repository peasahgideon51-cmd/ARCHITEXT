import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/Button";
import { Card } from "../components/Card";

const UNITS = ["Imperial (ft)", "Metric (m)"];
const FORMATS = ["PNG Image", "PDF Document", "SVG Vector"];

export function SettingsScreen({ onShowAuth }: { onShowAuth: () => void }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [units, setUnits] = useState("Imperial (ft)");
  const [exportFmt, setExportFmt] = useState("PNG Image");

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem("architext_units"),
      AsyncStorage.getItem("architext_fmt"),
    ]).then(([u, f]) => {
      if (u) setUnits(u);
      if (f) setExportFmt(f);
    });
  }, []);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.pageBg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.eyebrowRow}>
        <Ionicons name="settings-outline" size={12} color={theme.muted} />
        <Text style={[styles.eyebrow, { color: theme.muted }]}>
          Preferences
        </Text>
      </View>
      <Text style={[styles.pageTitle, { color: theme.dark }]}>Settings</Text>
      <Text style={[styles.pageSub, { color: theme.muted }]}>
        Manage your application preferences.
      </Text>

      {/* Account */}
      <Card>
        <Text style={[styles.cardTitle, { color: theme.dark }]}>Account</Text>
        <Text style={[styles.cardSub, { color: theme.muted }]}>
          Manage your Architext account.
        </Text>
        {user ? (
          <View style={styles.accountRow}>
            <View style={[styles.avatar, { backgroundColor: theme.brown }]}>
              <Text style={styles.avatarText}>
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.accountName, { color: theme.dark }]}>
                {user.name}
              </Text>
              <Text style={[styles.accountEmail, { color: theme.muted }]}>
                {user.email}
              </Text>
              <Text style={[styles.accountPlan, { color: theme.brown }]}>
                {user.plan}
              </Text>
            </View>
            <TouchableOpacity
              onPress={logout}
              style={[styles.logoutBtn, { borderColor: theme.border }]}
            >
              <Ionicons name="log-out-outline" size={14} color={theme.mid} />
              <Text style={[styles.logoutText, { color: theme.mid }]}>
                Sign out
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Button
            label="Sign In / Create Account"
            onPress={onShowAuth}
            variant="secondary"
          />
        )}
      </Card>

      {/* Dark mode */}
      <Card>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.dark }]}>
              Dark Mode
            </Text>
            <Text
              style={[styles.cardSub, { color: theme.muted, marginBottom: 0 }]}
            >
              Switch between light and dark appearance.
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.border, true: theme.brown }}
            thumbColor="#ffffff"
          />
        </View>
      </Card>

      {/* Units */}
      <Card>
        <Text style={[styles.cardTitle, { color: theme.dark }]}>
          Measurement Units
        </Text>
        <Text style={[styles.cardSub, { color: theme.muted }]}>
          Choose your preferred unit for floor plan dimensions.
        </Text>
        <View style={styles.optionRow}>
          {UNITS.map((u) => (
            <TouchableOpacity
              key={u}
              onPress={async () => {
                setUnits(u);
                await AsyncStorage.setItem("architext_units", u);
              }}
              style={[
                styles.radioOption,
                {
                  borderColor: units === u ? theme.brown : theme.border,
                  backgroundColor: units === u ? theme.brownBg : "transparent",
                },
              ]}
            >
              <View
                style={[
                  styles.radioDot,
                  {
                    borderColor: units === u ? theme.brown : theme.border,
                    backgroundColor: units === u ? theme.brown : "transparent",
                  },
                ]}
              />
              <Text
                style={[
                  styles.radioText,
                  { color: units === u ? theme.brown : theme.mid },
                ]}
              >
                {u}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Export format */}
      <Card>
        <Text style={[styles.cardTitle, { color: theme.dark }]}>
          Default Export Format
        </Text>
        <Text style={[styles.cardSub, { color: theme.muted }]}>
          File format when exporting floor plans.
        </Text>
        <View style={styles.formatGroup}>
          {FORMATS.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={async () => {
                setExportFmt(f);
                await AsyncStorage.setItem("architext_fmt", f);
              }}
              style={[
                styles.fmtBtn,
                {
                  borderColor: exportFmt === f ? theme.brown : theme.border,
                  backgroundColor:
                    exportFmt === f ? theme.brownBg : theme.white,
                },
              ]}
            >
              <Text
                style={[
                  styles.fmtText,
                  { color: exportFmt === f ? theme.brown : theme.mid },
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  pageTitle: {
    fontFamily: "Merriweather_700Bold",
    fontSize: 26,
    marginBottom: 6,
  },
  pageSub: { fontSize: 13, fontWeight: "300", marginBottom: 20 },
  cardTitle: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  cardSub: {
    fontSize: 12,
    fontWeight: "300",
    marginBottom: 16,
    lineHeight: 18,
  },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  accountRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  accountName: { fontSize: 14, fontWeight: "600" },
  accountEmail: { fontSize: 12, marginTop: 1 },
  accountPlan: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  logoutText: { fontSize: 12 },
  optionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderRadius: 100,
  },
  radioDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  radioText: { fontSize: 13, fontWeight: "500" },
  formatGroup: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  fmtBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderRadius: 9,
  },
  fmtText: { fontSize: 13, fontWeight: "500" },
});
