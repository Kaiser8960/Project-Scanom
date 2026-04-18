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

    if (!loggedIn && !inAuth) {
      router.replace("/(auth)/sign-in");
    } else if (loggedIn && inAuth) {
      router.replace("/(tabs)/map");
    }
    setChecking(false);
  }

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0F2419" }}>
        <ActivityIndicator color="#4ADE80" size="large" />
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
