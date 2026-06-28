import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ImageBackground } from 'react-native';

export function SplashScreen({ onEnter }: { onEnter: () => void }) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(-16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1800&q=80' }}
      style={styles.root}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <Animated.View style={[styles.content, { opacity: fade, transform: [{ translateY: slide }] }]}>
        <View style={styles.iconBox}>
          <Text style={styles.iconText}>⊞</Text>
        </View>
        <Text style={styles.title}>Architext</Text>
        <Text style={styles.sub}>
          Transform your words into beautiful, precise floor plans in seconds.
        </Text>
        <TouchableOpacity onPress={onEnter} style={styles.btn} activeOpacity={0.85}>
          <Text style={styles.btnText}>Start Designing</Text>
        </TouchableOpacity>
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  content: { alignItems: 'center', paddingHorizontal: 32 },
  iconBox: { width: 72, height: 72, backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 26 },
  iconText: { fontSize: 28, color: '#fff' },
  title: { fontFamily: 'Merriweather_700Bold', fontSize: 52, color: '#fff', letterSpacing: -1, textAlign: 'center', marginBottom: 16 },
  sub: { fontSize: 16, color: 'rgba(255,255,255,0.72)', fontWeight: '300', lineHeight: 26, textAlign: 'center', maxWidth: 320, marginBottom: 38 },
  btn: { paddingVertical: 14, paddingHorizontal: 42, backgroundColor: '#9b633f', borderRadius: 100 },
  btnText: { fontFamily: 'Merriweather_700Bold', fontSize: 15, color: '#fff' },
});
