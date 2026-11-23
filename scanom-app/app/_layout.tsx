import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { isLoggedIn } from "@/services/auth";
import { requestNotificationPermission } from "@/services/notifications";

/**
 * Root layout and authentication guard.
 * Redirects unauthenticated users to sign-in and authenticated users to the map tab.
 */
export default function RootLayout() {
  const router   = useRouter();
  const segments = useSegments();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const loggedIn = await isLoggedIn();
    const inAuth   = segments[0] === "(auth)";
    const inTabs   = segments[0] === "(tabs)";

    if (!loggedIn && !inAuth) {
      // Redirect unauthenticated users to sign-in
      router.replace("/(auth)/sign-in");
    } else if (loggedIn && inAuth) {
      // Redirect logged-in users to the main map tab
      router.replace("/(tabs)/map");
    } else if (loggedIn && !inTabs) {
      // Default route for logged-in users on cold start
      router.replace("/(tabs)/map");
    }
    if (loggedIn) requestNotificationPermission();
    setChecking(false);
  }

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }}>
        <ActivityIndicator color="#1B4A2F" size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Slot />
    </GestureHandlerRootView>
  );
}
