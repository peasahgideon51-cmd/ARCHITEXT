import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useHistory, useSaved } from '../hooks/useStore';
import { generateLayout, Plan } from '../services/api';
import { EXAMPLES, ROOM_COLOURS, DEFAULT_ROOM_COLOUR } from '../constants/theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

interface ManualRoom { name: string; w: string; h: string; }

export function HomeScreen() {
  const { theme } = useTheme();
  const { addToHistory } = useHistory();
  const { savePlan } = useSaved();

  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [view, setView] = useState<'2d' | '3d'>('2d');
  const [savedNow, setSavedNow] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomW, setRoomW] = useState('');
  const [roomH, setRoomH] = useState('');
  const [manualRooms, setManualRooms] = useState<ManualRoom[]>([]);

  const handleGenerate = async () => {
    if (!description.trim()) { setError('Please describe your space first.'); return; }
    setError(''); setGenerating(true); setPlan(null);
    try {
      const data = await generateLayout(description.trim());
      if (!data.ok) { setError(data.error || 'Generation failed.'); return; }
      setPlan(data.plan); setView('2d');
      await addToHistory(data.plan, description);
    } catch (err: any) {
      setError(`Could not reach the server. Make sure app.py is running.\n${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleAddRoom = () => {
    if (!roomName.trim()) return;
    const room: ManualRoom = { name: roomName.trim(), w: roomW, h: roomH };
    setManualRooms((p) => [...p, room]);
    setDescription((d) => d ? `${d}\n${room.name}${room.w && room.h ? ` ${room.w}x${room.h}` : ''}` : room.name);
    setRoomName(''); setRoomW(''); setRoomH('');
  };

  const handleSave = async () => {
    if (!plan) return;
    await savePlan(plan);
    setSavedNow(true);
    setTimeout(() => setSavedNow(false), 2000);
  };

  const svgHtml = plan?.svg
    ? `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#fdfaf7}svg{width:100%;height:auto}</style></head><body>${plan.svg}</body></html>`
    : null;

  return (
    <ScrollView style={[styles.root, { backgroundColor: theme.pageBg }]} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.eyebrowRow}>
        <Ionicons name="grid-outline" size={12} color={theme.muted} />
        <Text style={[styles.eyebrow, { color: theme.muted }]}>Floor Plan Builder</Text>
      </View>
      <Text style={[styles.pageTitle, { color: theme.dark }]}>Design your space</Text>
      <Text style={[styles.pageSub, { color: theme.muted }]}>Describe rooms in natural language — or add them one by one.</Text>

      {/* Describe card */}
      <Card>
        <View style={styles.descHeader}>
          <View style={[styles.descIcon, { backgroundColor: theme.brownBg }]}>
            <Ionicons name="sparkles-outline" size={16} color={theme.brown} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.descTitle, { color: theme.dark }]}>Describe Your Space</Text>
            <Text style={[styles.descSub, { color: theme.muted }]}>Natural language or room-per-line</Text>
          </View>
        </View>

        <TextInput
          style={[styles.textarea, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.dark }]}
          placeholder="e.g. 3-bedroom house with open kitchen, living room, 2 bathrooms and a garage"
          placeholderTextColor={theme.muted}
          value={description}
          onChangeText={setDescription}
          multiline numberOfLines={5} textAlignVertical="top"
        />

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: theme.errorBg, borderColor: theme.errorBorder }]}>
            <Text style={[styles.errorText, { color: theme.errorText }]}>{error}</Text>
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          {Object.keys(EXAMPLES).map((key) => (
            <TouchableOpacity key={key} onPress={() => setDescription(EXAMPLES[key])} style={[styles.exChip, { borderColor: theme.border }]}>
              <Text style={[styles.exChipText, { color: theme.mid }]}>{key}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Button label={generating ? 'Generating…' : 'Generate Floor Plan'} onPress={handleGenerate} loading={generating} />
      </Card>

      {/* Manual rooms card */}
      <Card>
        <View style={styles.rowGap}>
          <Ionicons name="add" size={14} color={theme.mid} />
          <Text style={[styles.cardTitle, { color: theme.dark }]}>Add a Room Manually</Text>
        </View>
        <Input placeholder="Room name (e.g. Master Bedroom)" value={roomName} onChangeText={setRoomName} containerStyle={{ marginBottom: 10 }} />
        <View style={styles.dimRow}>
          <Input placeholder="Width (ft)" value={roomW} onChangeText={setRoomW} keyboardType="numeric" containerStyle={{ flex: 1 }} />
          <View style={{ width: 10 }} />
          <Input placeholder="Height (ft)" value={roomH} onChangeText={setRoomH} keyboardType="numeric" containerStyle={{ flex: 1 }} />
        </View>
        <Button label="Add Room" onPress={handleAddRoom} variant="ghost" style={{ marginTop: 6 }} />
        {manualRooms.length > 0 && (
          <View style={styles.roomTags}>
            {manualRooms.map((r, i) => (
              <View key={i} style={[styles.roomTag, { backgroundColor: theme.brownBg, borderColor: '#e0d4cb' }]}>
                <Text style={[styles.roomTagText, { color: theme.brownDark }]}>{r.name}{r.w && r.h ? ` ${r.w}×${r.h}` : ''}</Text>
                <TouchableOpacity onPress={() => setManualRooms((p) => p.filter((_, idx) => idx !== i))}>
                  <Ionicons name="close" size={12} color={theme.muted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Output card */}
      <Card>
        <View style={styles.outputHeader}>
          <View>
            <Text style={[styles.cardTitle, { color: theme.dark }]}>Floor Plan Output</Text>
            <Text style={[styles.outputSub, { color: theme.muted }]}>
              {plan ? `${plan.rooms.length} rooms · ${plan.template}` : generating ? 'Generating…' : 'Your floor plan will appear here'}
            </Text>
          </View>
          {plan && (
            <TouchableOpacity onPress={handleSave} style={[styles.iconBtn, { borderColor: theme.border }]}>
              <Ionicons name={savedNow ? 'bookmark' : 'bookmark-outline'} size={14} color={savedNow ? theme.brown : theme.mid} />
              <Text style={[styles.iconBtnText, { color: savedNow ? theme.brown : theme.mid }]}>{savedNow ? 'Saved!' : 'Save'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {plan && (
          <View style={styles.viewToggle}>
            {(['2d', '3d'] as const).map((v) => (
              <TouchableOpacity key={v} onPress={() => setView(v)} style={[styles.viewBtn, { borderColor: view === v ? theme.brown : theme.border, backgroundColor: view === v ? theme.brownBg : theme.white }]}>
                <Ionicons name={v === '2d' ? 'square-outline' : 'cube-outline'} size={13} color={view === v ? theme.brown : theme.mid} />
                <Text style={[styles.viewBtnText, { color: view === v ? theme.brown : theme.mid }]}>{v.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={[styles.canvas, { backgroundColor: plan ? '#fdfaf7' : theme.brownBg }]}>
          {generating ? (
            <View style={styles.centerPad}>
              <ActivityIndicator color={theme.brown} size="large" />
              <Text style={[styles.spinnerText, { color: theme.muted }]}>Analysing and building layout…</Text>
            </View>
          ) : plan && view === '2d' && svgHtml ? (
            <WebView source={{ html: svgHtml }} style={styles.webview} scrollEnabled={false} showsVerticalScrollIndicator={false} />
          ) : plan && view === '3d' ? (
            <View style={styles.centerPad}>
              <Ionicons name="cube-outline" size={32} color={theme.brown} />
              <Text style={[styles.placeholderText, { color: theme.muted }]}>3D view coming soon.</Text>
            </View>
          ) : (
            <View style={styles.centerPad}>
              <View style={[styles.placeholderIcon, { backgroundColor: 'rgba(155,99,63,0.1)' }]}>
                <Ionicons name="grid-outline" size={24} color={theme.brown} />
              </View>
              <Text style={[styles.placeholderText, { color: theme.muted }]}>Describe your space{'\n'}to generate a plan</Text>
            </View>
          )}
        </View>

        {plan && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            {plan.rooms.map((r, i) => {
              const [bg, tc] = ROOM_COLOURS[r.room_type] || DEFAULT_ROOM_COLOUR;
              return (
                <View key={i} style={[styles.roomChip, { backgroundColor: bg, borderColor: tc + '40' }]}>
                  <Text style={[styles.roomChipText, { color: tc }]}>{r.label}</Text>
                </View>
              );
            })}
          </ScrollView>
        )}
      </Card>

      {plan?.explanation?.length ? (
        <View style={[styles.expCard, { backgroundColor: theme.dark }]}>
          <Text style={[styles.expTitle, { color: theme.brownLight }]}>LAYOUT DECISIONS</Text>
          {plan.explanation.map((e, i) => (
            <View key={i} style={[styles.logEntry, { borderBottomColor: 'rgba(255,255,255,0.06)' }]}>
              <View style={[styles.logDot, { backgroundColor: theme.brownLight }]} />
              <Text style={[styles.logText, { color: 'rgba(255,255,255,0.6)' }]}>{e}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  eyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase' },
  pageTitle: { fontFamily: 'Merriweather_700Bold', fontSize: 26, marginBottom: 6 },
  pageSub: { fontSize: 13, fontWeight: '300', marginBottom: 20 },
  descHeader: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  descIcon: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  descTitle: { fontSize: 14, fontWeight: '600' },
  descSub: { fontSize: 12, fontWeight: '300', marginTop: 2 },
  textarea: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 13, lineHeight: 22, minHeight: 120, marginBottom: 12 },
  errorBox: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
  errorText: { fontSize: 12, lineHeight: 18 },
  exChip: { borderWidth: 1, borderRadius: 100, paddingVertical: 6, paddingHorizontal: 14, marginRight: 7 },
  exChipText: { fontSize: 12 },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 14, fontWeight: '600' },
  dimRow: { flexDirection: 'row', marginBottom: 4 },
  roomTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  roomTag: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 },
  roomTagText: { fontSize: 12 },
  outputHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  outputSub: { fontSize: 12, fontWeight: '300', marginTop: 2 },
  iconBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderRadius: 8 },
  iconBtnText: { fontSize: 12 },
  viewToggle: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 16, borderWidth: 1.5, borderRadius: 100 },
  viewBtnText: { fontSize: 12, fontWeight: '500' },
  canvas: { borderRadius: 10, minHeight: 320, overflow: 'hidden' },
  webview: { height: 360, backgroundColor: 'transparent' },
  centerPad: { padding: 60, alignItems: 'center', gap: 12 },
  spinnerText: { fontSize: 13, fontWeight: '300' },
  placeholderIcon: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 13, fontWeight: '300', textAlign: 'center', lineHeight: 20 },
  roomChip: { borderWidth: 1, borderRadius: 100, paddingVertical: 4, paddingHorizontal: 12, marginRight: 6 },
  roomChipText: { fontSize: 11, fontWeight: '500' },
  expCard: { borderRadius: 14, padding: 20, marginBottom: 14 },
  expTitle: { fontSize: 10, fontWeight: '600', letterSpacing: 2, marginBottom: 12 },
  logEntry: { flexDirection: 'row', gap: 10, paddingVertical: 7, borderBottomWidth: 1 },
  logDot: { width: 5, height: 5, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  logText: { flex: 1, fontSize: 12, fontWeight: '300', lineHeight: 18 },
});
