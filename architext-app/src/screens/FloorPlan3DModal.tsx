import React, { useRef, useState } from "react";
import { Modal, View, StyleSheet, StatusBar } from "react-native";
import { WebView } from "react-native-webview";
import { THREE_VIEWER_HTML } from "../constants/threeViewerHtml";
import { Room } from "../services/api";

interface FloorPlan3DModalProps {
  visible: boolean;
  rooms: Room[];
  adjacencies: [string, string][];
  onClose: () => void;
}

export function FloorPlan3DModal({
  visible,
  rooms,
  adjacencies,
  onClose,
}: FloorPlan3DModalProps) {
  const webviewRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);

  const sendRooms = () => {
    const payload = JSON.stringify({ type: "rooms", rooms, adjacencies });
    // Inject directly as JS — more reliable than postMessage in Expo Go WebView
    webviewRef.current?.injectJavaScript(`
      (function() {
        try {
          handleMessage({ data: ${JSON.stringify(payload)} });
        } catch(e) {
          console.error('3D inject error', e);
        }
      })();
      true;
    `);
  };

  const handleLoadEnd = () => {
    // Wait a beat for Three.js to finish initialising before sending data
    setTimeout(sendRooms, 600);
  };

  const handleMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "close") onClose();
    } catch (_) {}
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <View style={styles.root}>
        <WebView
          ref={webviewRef}
          source={{ html: THREE_VIEWER_HTML }}
          style={styles.webview}
          onLoadEnd={handleLoadEnd}
          onMessage={handleMessage}
          javaScriptEnabled
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          originWhitelist={["*"]}
          mixedContentMode="always"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f0e8" },
  webview: { flex: 1, backgroundColor: "#f5f0e8" },
});
