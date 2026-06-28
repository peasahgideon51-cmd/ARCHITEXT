import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { HomeScreen } from "../screens/HomeScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { SavedScreen } from "../screens/SavedScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { useTheme } from "../context/ThemeContext";

const Stack = createStackNavigator();

function HeaderRight({
  navigation,
  onShowAuth,
}: {
  navigation: any;
  onShowAuth: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 8, marginRight: 12 }}>
      <TouchableOpacity
        onPress={() => navigation.navigate("History")}
        style={styles.headerBtn}
      >
        <Ionicons name="time-outline" size={20} color={theme.mid} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigation.navigate("Saved")}
        style={styles.headerBtn}
      >
        <Ionicons name="bookmark-outline" size={20} color={theme.mid} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigation.navigate("Settings")}
        style={styles.headerBtn}
      >
        <Ionicons name="settings-outline" size={20} color={theme.mid} />
      </TouchableOpacity>
    </View>
  );
}

export function AppNavigator({ onShowAuth }: { onShowAuth: () => void }) {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.cream2 },
        headerTitleStyle: {
          fontFamily: "Merriweather_700Bold",
          fontSize: 17,
          color: theme.dark,
        },
        headerShadowVisible: false,
        cardStyle: { backgroundColor: theme.pageBg },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={({ navigation }) => ({
          title: "Architext",
          headerRight: () => (
            <HeaderRight navigation={navigation} onShowAuth={onShowAuth} />
          ),
        })}
      />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Saved" component={SavedScreen} />
      <Stack.Screen name="Settings" options={{ title: "Settings" }}>
        {() => <SettingsScreen onShowAuth={onShowAuth} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerBtn: { padding: 6 },
});
