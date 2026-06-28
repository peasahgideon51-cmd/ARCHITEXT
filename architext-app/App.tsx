import "react-native-gesture-handler";
import React, { useState, useCallback } from "react";
import { View } from "react-native";
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
