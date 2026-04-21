import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProfileAvatar from "@/components/ui/ProfileAvatar";

/**
 * 3-tab navigator: Map (left) | Scanner (elevated center) | History (right)
 * Profile is a floating avatar in the header of every tab — not a tab itself.
 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: "#4ADE80",
        tabBarInactiveTintColor: "#6B7280",
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.label,
        headerStyle: styles.header,
        headerTintColor: "#F0FDF4",
        headerTitleStyle: styles.headerTitle,
        // Floating profile avatar shown on every tab
        headerRight: () => <ProfileAvatar />,
        headerRightContainerStyle: styles.headerRightContainer,
      }}
    >
      {/* ── MAP TAB ─────────────────────────────────────────── */}
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

      {/* ── SCANNER (elevated center FAB) ────────────────────── */}
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          headerTitle: "Scanner",
          tabBarIcon: ({ focused }) => (
            <View style={[styles.scanFab, focused && styles.scanFabActive]}>
              <Ionicons name="scan-outline" size={28} color="#F0FDF4" />
            </View>
          ),
          tabBarLabel: () => null,    // No label under the FAB
        }}
      />

      {/* ── HISTORY TAB ─────────────────────────────────────── */}
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
  tabBar: {
    backgroundColor: "#0F2419",
    borderTopColor: "#1B3A2D",
    borderTopWidth: 1,
    height: 68,
    paddingBottom: 8,
    paddingTop: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
  },
  header: {
    backgroundColor: "#0F2419",
    borderBottomColor: "#1B3A2D",
    borderBottomWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTitle: {
    color: "#F0FDF4",
    fontWeight: "700",
    fontSize: 18,
  },
  headerRightContainer: {
    paddingRight: 16,
  },
  scanFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1B3A2D",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#4ADE80",
    shadowColor: "#4ADE80",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  scanFabActive: {
    backgroundColor: "#1B4A2F",
    borderColor: "#86EFAC",
  },
});
