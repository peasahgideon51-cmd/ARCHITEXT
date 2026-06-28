import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { name: 'Home',     label: 'Home',     sub: 'New floor plan',   icon: 'home-outline' as const },
  { name: 'History',  label: 'History',  sub: 'Past designs',     icon: 'time-outline' as const },
  { name: 'Saved',    label: 'Saved',    sub: 'Bookmarked plans', icon: 'bookmark-outline' as const },
  { name: 'Settings', label: 'Settings', sub: 'Preferences',      icon: 'settings-outline' as const },
];

export function DrawerContent(props: DrawerContentComponentProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const current = props.state.routeNames[props.state.index];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.cream2 }]}>
      {/* Logo */}
      <View style={[styles.logoRow, { borderBottomColor: theme.border }]}>
        <View style={[styles.logoIcon, { backgroundColor: theme.white, borderColor: theme.border }]}>
          <Ionicons name="grid-outline" size={16} color={theme.brown} />
        </View>
        <Text style={[styles.logoText, { color: theme.dark }]}>Architext</Text>
      </View>

      <Text style={[styles.navLabel, { color: theme.muted }]}>NAVIGATION</Text>

      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map((item) => {
          const active = current === item.name;
          return (
            <TouchableOpacity
              key={item.name}
              onPress={() => props.navigation.navigate(item.name)}
              style={[styles.navItem, active && { backgroundColor: theme.brownBg }]}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, active && { backgroundColor: 'rgba(155,99,63,0.14)' }]}>
                <Ionicons name={item.icon} size={16} color={active ? theme.brown : theme.mid} />
              </View>
              <View style={styles.navText}>
                <Text style={[styles.navName, { color: active ? theme.brown : theme.dark }]}>{item.label}</Text>
                <Text style={[styles.navSub, { color: theme.muted }]}>{item.sub}</Text>
              </View>
              {active && <Ionicons name="chevron-forward" size={12} color={theme.brown} />}
            </TouchableOpacity>
          );
        })}
      </DrawerContentScrollView>

      {/* User chip */}
      <View style={[styles.userChip, { backgroundColor: theme.white, borderColor: theme.border }]}>
        <View style={[styles.avatar, { backgroundColor: theme.brown }]}>
          <Text style={styles.avatarText}>{user ? user.name.charAt(0).toUpperCase() : 'A'}</Text>
        </View>
        <View>
          <Text style={[styles.userName, { color: theme.dark }]}>{user ? user.name : 'Architect'}</Text>
          <Text style={[styles.userPlan, { color: theme.muted }]}>{user ? user.plan : 'Free Plan'}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20, borderBottomWidth: 1 },
  logoIcon: { width: 34, height: 34, borderWidth: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontFamily: 'Merriweather_700Bold', fontSize: 17 },
  navLabel: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, fontSize: 10, fontWeight: '600', letterSpacing: 1.8 },
  scrollContent: { paddingHorizontal: 10, gap: 2 },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, marginBottom: 2 },
  iconBox: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  navText: { flex: 1, marginLeft: 10 },
  navName: { fontSize: 14, fontWeight: '500' },
  navSub: { fontSize: 11, fontWeight: '300', marginTop: 1 },
  userChip: { margin: 10, padding: 12, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  userName: { fontSize: 13, fontWeight: '500' },
  userPlan: { fontSize: 11, fontWeight: '300' },
});
