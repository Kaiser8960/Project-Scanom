import { Tabs } from "expo-router";
import { View, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProfileAvatar from "@/components/ui/ProfileAvatar";

/**
 * Tab navigator — White-primary color scheme.
 *
 * Design philosophy (aligned with image 2 reference):
 *   - White is the PRIMARY color (header, nav bar, all screens)
 *   - Dark forest green (#1B4A2F) is the ACCENT color
 *     (active icons, borders, buttons, section titles)
 *   - Gray (#9CA3AF) for inactive/secondary elements
 *
 * This makes green feel intentional and premium rather than dominant.
 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: "#1B4A2F",      // Dark forest green — active
        tabBarInactiveTintColor: "#9CA3AF",    // Gray — inactive
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.label,
        headerStyle: styles.header,
        headerTintColor: "#1B4A2F",
        headerTitleStyle: styles.headerTitle,
        headerRight: () => <ProfileAvatar />,
        headerRightContainerStyle: styles.headerRightContainer,
      }}
    >
      {/* ── MAP ─────────────────────────────────────────── */}
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          headerTitle: "Risk Map",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── SCAN (center circle button) ──────────────────── */}
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          headerTitle: "Scanner",
          tabBarIcon: ({ focused }) => (
            <View style={styles.fabWrap}>
              <View style={[styles.fabCircle, focused && styles.fabCircleActive]}>
                <Ionicons name="scan-outline" size={24} color="#FFFFFF" />
              </View>
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />

      {/* ── HISTORY ─────────────────────────────────────── */}
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          headerTitle: "Scan History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // ── Header — white surface ─────────────────────────────────────────────────
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomColor: "#E5E7EB",
    borderBottomWidth: 1,
    elevation: 0,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  headerTitle: {
    color: "#111827",          // Dark text on white header
    fontWeight: "700",
    fontSize: 18,
  },
  headerRightContainer: {
    paddingRight: 16,
  },

  // ── Tab bar — white surface ────────────────────────────────────────────────
  tabBar: {
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E5E7EB",
    borderTopWidth: 1,
    height: Platform.select({ ios: 84, android: 68 }),
    paddingBottom: Platform.select({ ios: 28, android: 8 }),
    paddingTop: 6,
    // Subtle lift shadow
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 4,
    elevation: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
  },

  // ── Scan FAB (dark green circle, no big elevation) ─────────────────────────
  fabWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Platform.select({ ios: 14, android: 10 }),
  },
  fabCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1B4A2F",     // Dark forest green
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E8F5E9",
    shadowColor: "#1B4A2F",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  fabCircleActive: {
    backgroundColor: "#0F2419",     // Deeper green when focused
    borderColor: "#D1FAE5",
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 10,
  },
});
