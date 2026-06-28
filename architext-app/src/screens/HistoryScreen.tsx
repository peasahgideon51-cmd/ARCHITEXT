import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useHistory, HistoryEntry } from '../hooks/useStore';

export function HistoryScreen() {
  const { theme } = useTheme();
  const { history } = useHistory();
  const navigation = useNavigation<any>();

  const handleOpen = (item: HistoryEntry) => {
    navigation.navigate('Home', { loadedEntry: item });
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.pageBg }]}>
      <View style={styles.header}>
        <View style={styles.eyebrowRow}>
          <Ionicons name="time-outline" size={12} color={theme.muted} />
          <Text style={[styles.eyebrow, { color: theme.muted }]}>Recent Activity</Text>
        </View>
        <Text style={[styles.pageTitle, { color: theme.dark }]}>History</Text>
        <Text style={[styles.pageSub, { color: theme.muted }]}>Your previously generated floor plans.</Text>
      </View>

      {history.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[styles.emptyText, { color: theme.muted }]}>No plans yet — start designing to build your history.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(h) => String(h.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: { item: HistoryEntry }) => (
            <TouchableOpacity
              style={[styles.item, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
              activeOpacity={0.7}
              onPress={() => handleOpen(item)}
            >
              <View style={styles.itemLeft}>
                <View style={[styles.thumb, { backgroundColor: theme.brownBg }]}>
                  <Ionicons name="grid-outline" size={18} color={theme.brown} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: theme.dark }]} numberOfLines={1}>{item.title}</Text>
                  <View style={styles.meta}>
                    <Text style={[styles.metaText, { color: theme.muted }]}>{item.rooms} rooms{item.sqft ? ` · ${item.sqft} sq ft` : ''}</Text>
                    <View style={[styles.metaDot, { backgroundColor: theme.border }]} />
                    <Text style={[styles.metaText, { color: theme.muted }]}>{item.time}</Text>
                  </View>
                  {item.description ? (
                    <Text style={[styles.descPreview, { color: theme.muted }]} numberOfLines={1}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Text style={[styles.open, { color: theme.brown }]}>Open →</Text>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            <View style={[styles.footer, { borderColor: theme.border }]}>
              <Text style={[styles.footerText, { color: theme.muted }]}>Showing last {history.length} plan{history.length !== 1 ? 's' : ''}</Text>
            </View>
          }
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
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, padding: 16 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  thumb: { width: 42, height: 42, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, fontWeight: '300' },
  metaDot: { width: 3, height: 3, borderRadius: 2 },
  descPreview: { fontSize: 11, marginTop: 3, fontWeight: '300' },
  open: { fontSize: 13, fontWeight: '500' },
  emptyBox: { margin: 24, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 36, alignItems: 'center' },
  emptyText: { fontSize: 13, fontWeight: '300', textAlign: 'center' },
  footer: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 4 },
  footerText: { fontSize: 12, fontWeight: '300' },
});
