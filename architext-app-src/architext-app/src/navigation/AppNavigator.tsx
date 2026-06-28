import React from "react";
import { TouchableOpacity } from "react-native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { DrawerContent } from "../components/DrawerContent";
import { HomeScreen } from "../screens/HomeScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { SavedScreen } from "../screens/SavedScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { useTheme } from "../context/ThemeContext";

const Drawer = createDrawerNavigator();

function MenuButton({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={() => navigation.toggleDrawer()}
      style={{ marginLeft: 16, padding: 4 }}
    >
      <Ionicons name="menu-outline" size={24} color={theme.dark} />
    </TouchableOpacity>
  );
}

export function AppNavigator({ onShowAuth }: { onShowAuth: () => void }) {
  const { theme } = useTheme();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerStyle: {
          backgroundColor: theme.cream2,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontFamily: "Merriweather_700Bold",
          fontSize: 17,
          color: theme.dark,
        },
        headerLeft: () => <MenuButton navigation={navigation} />,
        drawerType: "front",
        swipeEnabled: true,
      })}
    >
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Architext" }}
      />
      <Drawer.Screen name="History" component={HistoryScreen} />
      <Drawer.Screen name="Saved" component={SavedScreen} />
      <Drawer.Screen name="Settings">
        {() => <SettingsScreen onShowAuth={onShowAuth} />}
      </Drawer.Screen>
    </Drawer.Navigator>
  );
}
