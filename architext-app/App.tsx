import "react-native-gesture-handler";
import React, { useState, useCallback, useEffect } from "react";
import { View, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Merriweather_700Bold,
} from "@expo-google-fonts/merriweather";
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
} from "@expo-google-fonts/dm-sans";
import * as SplashScreenExpo from "expo-splash-screen";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { SplashScreen } from "./src/screens/SplashScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { SignUpScreen } from "./src/screens/SignUpScreen";
import { AppNavigator } from "./src/navigation/AppNavigator";

SplashScreenExpo.preventAutoHideAsync();

type AuthView = "login" | "signup" | null;

function Root() {
  const { theme, isDark } = useTheme();
  const { user, isLoading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const [authView, setAuthView] = useState<AuthView>(null);

  if (isLoading)
    return <View style={{ flex: 1, backgroundColor: theme.pageBg }} />;
  if (!splashDone) return <SplashScreen onEnter={() => setSplashDone(true)} />;
  if (authView && !user) {
    if (authView === "login")
      return (
        <LoginScreen
          onNavigateToSignUp={() => setAuthView("signup")}
          onSkip={() => setAuthView(null)}
        />
      );
    return <SignUpScreen onNavigateToLogin={() => setAuthView("login")} />;
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <NavigationContainer>
        <AppNavigator onShowAuth={() => setAuthView("login")} />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Merriweather_700Bold,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });
  const onLayout = useCallback(async () => {
    if (fontsLoaded) await SplashScreenExpo.hideAsync();
  }, [fontsLoaded]);

  // Fixes RN Web scroll: without an explicit height chain, html/body/#root
  // default to auto-height, so ScrollView content clips instead of
  // scrolling in a browser. No-ops on native via the Platform check, so
  // this doesn't affect the Android/iOS build at all.
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const style = document.createElement("style");
      style.innerHTML = `html, body, #root { height: 100%; overflow-y: auto; }`;
      document.head.appendChild(style);
    }
  }, []);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayout}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <Root />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
