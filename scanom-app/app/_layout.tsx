import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { isLoggedIn } from "@/services/auth";

/**
 * Root layout — auth gate.
 * Checks SecureStore for a saved token. If none, redirects to sign-in.
 * Uses <Slot /> so all child routes render inside this context.
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
      // Not authenticated — send to sign-in
      router.replace("/(auth)/sign-in");
    } else if (loggedIn && inAuth) {
      // Already logged in but on auth screen — send to app
      router.replace("/(tabs)/map");
    } else if (loggedIn && !inTabs) {
      // Logged in but cold-start landed on no known route (e.g. not-found) — redirect to map
      router.replace("/(tabs)/map");
    }
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
