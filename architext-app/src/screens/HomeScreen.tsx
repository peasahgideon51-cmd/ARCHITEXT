import React, { useState, useEffect, useRef, useMemo } from "react";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { SvgXml } from "react-native-svg";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";
import { useHistory, useSaved } from "../hooks/useStore";
import { generateLayout, Plan } from "../services/api";
import {
  EXAMPLES,
  ROOM_COLOURS,
  DEFAULT_ROOM_COLOUR,
} from "../constants/theme";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { FloorPlan3DModal } from "../components/FloorPlan3DModal";

// Some versions / typings of FloorPlan3DModal's props don't include
// `adjacencies` even though the runtime component accepts it. Cast to
// `any` to avoid a TSX prop type error when passing adjacencies through.
const FloorPlan3DModalAny: any = FloorPlan3DModal;

interface ManualRoom {
  name: string;
  w: string;
  h: string;
}

// SvgXml's type declarations in this react-native-svg version don't
// include `ref` as a valid prop, even though the component forwards it
// at runtime (which is what makes toDataURL() reachable via the ref).
// Casting to `any` here sidesteps the incomplete typing without
// affecting actual behavior.
const SvgXmlAny: any = SvgXml;

// renderer.py's SVG viewBox is "0 0 W H" where W/H already include the
// dimension-line margin, title block, and scale bar — NOT the same as
// plan.canvas.w/h (which reflects the pre-margin layout canvas). Parsing
// the viewBox directly is the only reliable way to get the true export
// size, so the rasterized PNG isn't cropped.
function parseSvgSize(svg: string): { w: number; h: number } {
  const match = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (match) {
    return { w: parseFloat(match[1]), h: parseFloat(match[2]) };
  }
  return { w: 800, h: 600 };
}

export function HomeScreen() {
  const { theme, isDark } = useTheme();
  const { addToHistory } = useHistory();
  const { savePlan } = useSaved();
  const route = useRoute<any>();

  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [view, setView] = useState<"2d" | "3d">("2d");
  const [show3D, setShow3D] = useState(false);
  const [savedNow, setSavedNow] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportedNow, setExportedNow] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomW, setRoomW] = useState("");
  const [roomH, setRoomH] = useState("");
  const [manualRooms, setManualRooms] = useState<ManualRoom[]>([]);

  // Hidden off-screen SvgXml used purely to rasterize the current plan's
  // SVG to a PNG via its native toDataURL() — never shown to the user.
  // The visible 2D canvas below stays a WebView (unchanged).
  const svgExportRef = useRef<any>(null);

  // Load a history entry when navigated from History screen
  useEffect(() => {
    const entry = route.params?.loadedEntry;
    if (!entry) return;
    if (entry.plan) {
      setPlan(entry.plan);
    } else if (entry.svg) {
      setPlan({
        title: entry.title,
        template: "",
        rooms: [],
        adjacencies: entry.adjacencies || [],
        svg: entry.svg,
        explanation: entry.explanation || [],
        canvas: { w: 0, h: 0 },
      });
    }
    setView("2d");
    if (entry.description) setDescription(entry.description);
  }, [route.params?.loadedEntry]);

  const runGenerate = async (text: string) => {
    if (!text.trim()) {
      setError("Please describe your space first.");
      return;
    }
    setError("");
    setGenerating(true);
    setPlan(null);
    try {
      const data = await generateLayout(text.trim());
      if (!data.ok) {
        setError(data.error || "Generation failed.");
        return;
      }
      setPlan(data.plan);
      setView("2d");
      await addToHistory(data.plan, text);
    } catch (err: any) {
      setError(
        `Could not reach the server. Make sure app.py is running.\n${err.message}`,
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = () => runGenerate(description);

  const handleAddRoom = () => {
    if (!roomName.trim()) return;
    const room: ManualRoom = { name: roomName.trim(), w: roomW, h: roomH };
    setManualRooms((p) => [...p, room]);
    const roomText = `${room.name}${room.w && room.h ? ` ${room.w}x${room.h}` : ""}`;
    const newDesc = description ? `${description}\n${roomText}` : roomText;
    setDescription(newDesc);
    setRoomName("");
    setRoomW("");
    setRoomH("");
    runGenerate(newDesc);
  };

  // Bookmarks the plan data (JSON) into the app's own "saved plans" list.
  // Distinct from handleSaveImage below, which writes an actual PNG to
  // the device's Photos.
  const handleSave = async () => {
    if (!plan) return;
    await savePlan(plan);
    setSavedNow(true);
    setTimeout(() => setSavedNow(false), 2000);
  };

  // Rasterizes the plan to PNG, saves it to Photos, then opens the share
  // sheet for the same file — combines the old SVG-share Export with the
  // Save Image button so there's one action instead of two.
  const handleExport = async () => {
    if (!plan?.svg) return;
    if (
      !svgExportRef.current ||
      typeof svgExportRef.current.toDataURL !== "function"
    ) {
      // Surfaces a real problem instead of the button silently doing
      // nothing — e.g. if this react-native-svg version doesn't forward
      // ref on SvgXml the way older versions did.
      Alert.alert("Export", "Image export isn't available on this build.");
      return;
    }
    setExporting(true);
    try {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permission needed",
          "Allow photo library access to save the floor plan image.",
        );
        setExporting(false);
        return;
      }

      svgExportRef.current.toDataURL(async (base64: string) => {
        try {
          const fileName = `${(plan.title || "floorplan").replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.png`;
          const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
          await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // Save to Photos first — this is the already-proven part.
          await MediaLibrary.saveToLibraryAsync(fileUri);
          setExportedNow(true);
          setTimeout(() => setExportedNow(false), 2000);

          // Then offer the share sheet for the same image, preserving the
          // original Export button's "send this elsewhere" capability.
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(fileUri, {
              mimeType: "image/png",
              dialogTitle: `${plan.title} — Floor Plan`,
              UTI: "public.png",
            });
          }
        } catch (innerErr) {
          console.error("Export image error", innerErr);
          Alert.alert("Export", "Could not export the floor plan image.");
        } finally {
          setExporting(false);
        }
      });
    } catch (err) {
      console.error("Export error", err);
      Alert.alert("Export", "Could not export the floor plan.");
      setExporting(false);
    }
  };

  const handle3DToggle = () => {
    if (!plan || plan.rooms.length === 0) return;
    setShow3D(true);
  };

  const svgHtml = plan?.svg
    ? `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#fdfaf7}svg{width:100%;height:auto}</style></head><body>${plan.svg}</body></html>`
    : null;

  const svgExportSize = useMemo(
    () => (plan?.svg ? parseSvgSize(plan.svg) : { w: 800, h: 600 }),
    [plan?.svg],
  );

  const expBg = isDark ? "#1a1209" : "#2d1f14";
  const expText = "rgba(255,255,255,0.75)";
  const expDot = theme.brownLight;
  const expDivider = "rgba(255,255,255,0.08)";

  return (
    <>
      <ScrollView
        style={[styles.root, { backgroundColor: theme.pageBg }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.eyebrowRow}>
          <Ionicons name="grid-outline" size={12} color={theme.muted} />
          <Text style={[styles.eyebrow, { color: theme.muted }]}>
            Floor Plan Builder
          </Text>
        </View>
        <Text style={[styles.pageTitle, { color: theme.dark }]}>
          Design your space
        </Text>
        <Text style={[styles.pageSub, { color: theme.muted }]}>
          Describe rooms in natural language — or add them one by one.
        </Text>

        <Card>
          <View style={styles.descHeader}>
            <View style={[styles.descIcon, { backgroundColor: theme.brownBg }]}>
              <Ionicons name="sparkles-outline" size={16} color={theme.brown} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.descTitle, { color: theme.dark }]}>
                Describe Your Space
              </Text>
              <Text style={[styles.descSub, { color: theme.muted }]}>
                Natural language or room-per-line
              </Text>
            </View>
          </View>
          <TextInput
            style={[
              styles.textarea,
              {
                backgroundColor: theme.inputBg,
                borderColor: theme.border,
                color: theme.dark,
              },
            ]}
            placeholder="e.g. 3-bedroom house with open kitchen, living room, 2 bathrooms and a garage"
            placeholderTextColor={theme.muted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 14 }}
          >
            {Object.keys(EXAMPLES).map((key) => (
              <TouchableOpacity
                key={key}
                onPress={() => setDescription(EXAMPLES[key])}
                style={[styles.exChip, { borderColor: theme.border }]}
              >
                <Text style={[styles.exChipText, { color: theme.mid }]}>
                  {key}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Button
            label={generating ? "Generating…" : "Generate Floor Plan"}
            onPress={handleGenerate}
            loading={generating}
          />
        </Card>

        <Card>
          <View style={styles.rowGap}>
            <Ionicons name="add" size={14} color={theme.mid} />
            <Text style={[styles.cardTitle, { color: theme.dark }]}>
              Add a Room Manually
            </Text>
          </View>
          <Input
            placeholder="Room name (e.g. Master Bedroom)"
            value={roomName}
            onChangeText={setRoomName}
            containerStyle={{ marginBottom: 10 }}
          />
          <View style={styles.dimRow}>
            <Input
              placeholder="Width (ft)"
              value={roomW}
              onChangeText={setRoomW}
              keyboardType="numeric"
              containerStyle={{ flex: 1 }}
            />
            <View style={{ width: 10 }} />
            <Input
              placeholder="Height (ft)"
              value={roomH}
              onChangeText={setRoomH}
              keyboardType="numeric"
              containerStyle={{ flex: 1 }}
            />
          </View>
          <Button
            label="Add Room & Generate"
            onPress={handleAddRoom}
            variant="ghost"
            style={{ marginTop: 6 }}
          />
          {manualRooms.length > 0 && (
            <View style={styles.roomTags}>
              {manualRooms.map((r, i) => (
                <View
                  key={i}
                  style={[
                    styles.roomTag,
                    { backgroundColor: theme.brownBg, borderColor: "#e0d4cb" },
                  ]}
                >
                  <Text
                    style={[styles.roomTagText, { color: theme.brownDark }]}
                  >
                    {r.name}
                    {r.w && r.h ? ` ${r.w}×${r.h}` : ""}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setManualRooms((p) => p.filter((_, idx) => idx !== i))
                    }
                  >
                    <Ionicons name="close" size={12} color={theme.muted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </Card>

        <Card>
          <View style={styles.outputHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: theme.dark }]}>
                Floor Plan Output
              </Text>
              <Text style={[styles.outputSub, { color: theme.muted }]}>
                {plan
                  ? `${plan.rooms.length} rooms · ${plan.template}`
                  : generating
                    ? "Generating…"
                    : "Your floor plan will appear here"}
              </Text>
            </View>
            {plan && (
              <View style={styles.actionBtns}>
                <TouchableOpacity
                  onPress={handleExport}
                  disabled={exporting}
                  style={[styles.iconBtn, { borderColor: theme.border }]}
                >
                  {exporting ? (
                    <ActivityIndicator size="small" color={theme.mid} />
                  ) : (
                    <Ionicons
                      name={exportedNow ? "checkmark-circle" : "image-outline"}
                      size={14}
                      color={exportedNow ? theme.brown : theme.mid}
                    />
                  )}
                  <Text
                    style={[
                      styles.iconBtnText,
                      { color: exportedNow ? theme.brown : theme.mid },
                    ]}
                  >
                    {exportedNow ? "Exported!" : "Export"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  style={[styles.iconBtn, { borderColor: theme.border }]}
                >
                  <Ionicons
                    name={savedNow ? "bookmark" : "bookmark-outline"}
                    size={14}
                    color={savedNow ? theme.brown : theme.mid}
                  />
                  <Text
                    style={[
                      styles.iconBtnText,
                      { color: savedNow ? theme.brown : theme.mid },
                    ]}
                  >
                    {savedNow ? "Saved!" : "Bookmark"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {plan && (
            <View style={styles.viewToggle}>
              <TouchableOpacity
                onPress={() => setView("2d")}
                style={[
                  styles.viewBtn,
                  {
                    borderColor: view === "2d" ? theme.brown : theme.border,
                    backgroundColor:
                      view === "2d" ? theme.brownBg : theme.white,
                  },
                ]}
              >
                <Ionicons
                  name="square-outline"
                  size={13}
                  color={view === "2d" ? theme.brown : theme.mid}
                />
                <Text
                  style={[
                    styles.viewBtnText,
                    { color: view === "2d" ? theme.brown : theme.mid },
                  ]}
                >
                  2D
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handle3DToggle}
                style={[
                  styles.viewBtn,
                  {
                    borderColor: view === "3d" ? theme.brown : theme.border,
                    backgroundColor:
                      view === "3d" ? theme.brownBg : theme.white,
                  },
                ]}
              >
                <Ionicons
                  name="cube-outline"
                  size={13}
                  color={view === "3d" ? theme.brown : theme.mid}
                />
                <Text
                  style={[
                    styles.viewBtnText,
                    { color: view === "3d" ? theme.brown : theme.mid },
                  ]}
                >
                  3D
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View
            style={[
              styles.canvas,
              { backgroundColor: plan ? "#fdfaf7" : theme.brownBg },
            ]}
          >
            {generating ? (
              <View style={styles.centerPad}>
                <ActivityIndicator color={theme.brown} size="large" />
                <Text style={[styles.spinnerText, { color: theme.muted }]}>
                  Analysing and building layout…
                </Text>
              </View>
            ) : plan && view === "2d" && svgHtml ? (
              <WebView
                source={{ html: svgHtml }}
                style={styles.webview}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.centerPad}>
                <View
                  style={[
                    styles.placeholderIcon,
                    { backgroundColor: "rgba(155,99,63,0.1)" },
                  ]}
                >
                  <Ionicons name="grid-outline" size={24} color={theme.brown} />
                </View>
                <Text style={[styles.placeholderText, { color: theme.muted }]}>
                  Describe your space{"\n"}to generate a plan
                </Text>
              </View>
            )}
          </View>

          {plan && plan.rooms.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 12 }}
            >
              {plan.rooms.map((r, i) => {
                const [bg, tc] =
                  ROOM_COLOURS[r.room_type] || DEFAULT_ROOM_COLOUR;
                return (
                  <View
                    key={i}
                    style={[
                      styles.roomChip,
                      { backgroundColor: bg, borderColor: tc + "40" },
                    ]}
                  >
                    <Text style={[styles.roomChipText, { color: tc }]}>
                      {r.label}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </Card>

        {plan?.explanation?.length ? (
          <View style={[styles.expCard, { backgroundColor: expBg }]}>
            <Text style={[styles.expTitle, { color: expDot }]}>
              LAYOUT DECISIONS
            </Text>
            {plan.explanation.map((e, i) => (
              <View
                key={i}
                style={[styles.logEntry, { borderBottomColor: expDivider }]}
              >
                <View style={[styles.logDot, { backgroundColor: expDot }]} />
                <Text style={[styles.logText, { color: expText }]}>{e}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Hidden off-screen SVG used only to rasterize the current plan to
          a PNG via toDataURL(). Rendered (not display:none) so the native
          rasterizer has something to draw, but positioned far off-screen
          so it's never visible to the user. */}
      {plan?.svg && (
        <View style={styles.hiddenExport} pointerEvents="none">
          <SvgXmlAny
            xml={plan.svg}
            width={svgExportSize.w}
            height={svgExportSize.h}
            ref={svgExportRef}
          />
        </View>
      )}

      {/* 3D Full-screen Modal */}
      {plan && (
        <FloorPlan3DModalAny
          visible={show3D}
          rooms={plan.rooms}
          adjacencies={plan.adjacencies}
          onClose={() => {
            setShow3D(false);
            setView("2d");
          }}
        />
      )}
    </>
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
  descHeader: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
    alignItems: "flex-start",
  },
  descIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  descTitle: { fontSize: 14, fontWeight: "600" },
  descSub: { fontSize: 12, fontWeight: "300", marginTop: 2 },
  textarea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 13,
    lineHeight: 22,
    minHeight: 120,
    marginBottom: 12,
  },
  errorBox: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
  errorText: { fontSize: 12, lineHeight: 18 },
  exChip: {
    borderWidth: 1,
    borderRadius: 100,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 7,
  },
  exChipText: { fontSize: 12 },
  rowGap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 14, fontWeight: "600" },
  dimRow: { flexDirection: "row", marginBottom: 4 },
  roomTags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  roomTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  roomTagText: { fontSize: 12 },
  outputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  outputSub: { fontSize: 12, fontWeight: "300", marginTop: 2 },
  actionBtns: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  iconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  iconBtnText: { fontSize: 11 },
  viewToggle: { flexDirection: "row", gap: 8, marginBottom: 12 },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderRadius: 100,
  },
  viewBtnText: { fontSize: 12, fontWeight: "500" },
  canvas: { borderRadius: 10, minHeight: 320, overflow: "hidden" },
  webview: { height: 360, backgroundColor: "transparent" },
  centerPad: { padding: 60, alignItems: "center", gap: 12 },
  spinnerText: { fontSize: 13, fontWeight: "300" },
  placeholderIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 13,
    fontWeight: "300",
    textAlign: "center",
    lineHeight: 20,
  },
  roomChip: {
    borderWidth: 1,
    borderRadius: 100,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 6,
  },
  roomChipText: { fontSize: 11, fontWeight: "500" },
  expCard: { borderRadius: 14, padding: 20, marginBottom: 14 },
  expTitle: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 2,
    marginBottom: 12,
  },
  logEntry: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  logDot: { width: 5, height: 5, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  logText: { flex: 1, fontSize: 12, fontWeight: "300", lineHeight: 18 },
  hiddenExport: {
    position: "absolute",
    top: -100000,
    left: -100000,
    opacity: 0,
  },
});
