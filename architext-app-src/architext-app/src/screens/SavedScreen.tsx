import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSaved, SavedEntry } from '../hooks/useStore';

export function SavedScreen() {
  const { theme } = useTheme();
  const { saved } = useSaved();

  return (
    <View style={[styles.root, { backgroundColor: theme.pageBg }]}>
      <View style={styles.header}>
        <View style={styles.eyebrowRow}>
          <Ionicons name="bookmark-outline" size={12} color={theme.muted} />
          <Text style={[styles.eyebrow, { color: theme.muted }]}>Bookmarked</Text>
        </View>
        <Text style={[styles.pageTitle, { color: theme.dark }]}>Saved Plans</Text>
        <Text style={[styles.pageSub, { color: theme.muted }]}>Your bookmarked architectural designs.</Text>
      </View>

      {saved.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.brownBg }]}>
            <Ionicons name="bookmark-outline" size={24} color={theme.brown} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.dark }]}>No saved plans yet</Text>
          <Text style={[styles.emptyText, { color: theme.muted }]}>Save a floor plan from the builder to access it here anytime.</Text>
        </View>
      ) : (
        <FlatList
          data={saved}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: { item: SavedEntry }) => (
            <View style={[styles.item, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <View style={[styles.thumb, { backgroundColor: theme.brownBg }]}>
                <Ionicons name="bookmark-outline" size={18} color={theme.brown} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: theme.dark }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.metaText, { color: theme.muted }]}>{item.rooms} rooms · {item.time}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  eyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase' },
  pageTitle: { fontFamily: 'Merriweather_700Bold', fontSize: 26, marginBottom: 6 },
  pageSub: { fontSize: 13, fontWeight: '300', marginBottom: 4 },
  list: { paddingHorizontal: 24, gap: 10, paddingBottom: 40 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: 12, padding: 16 },
  thumb: { width: 42, height: 42, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  metaText: { fontSize: 12, fontWeight: '300' },
  empty: { margin: 24, borderWidth: 1, borderRadius: 14, padding: 50, alignItems: 'center' },
  emptyIcon: { width: 58, height: 58, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  emptyText: { fontSize: 13, fontWeight: '300', textAlign: 'center', lineHeight: 20, maxWidth: 220 },
});
