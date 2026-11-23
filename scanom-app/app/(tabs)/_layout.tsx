import { Tabs } from "expo-router";
import { View, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProfileAvatar from "@/components/ui/ProfileAvatar";

/**
 * Bottom tab bar layout for Risk Map, Scanner, and Scan History.
 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: "#1B4A2F",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.label,
        headerStyle: styles.header,
        headerTintColor: "#1B4A2F",
        headerTitleStyle: styles.headerTitle,
        headerRight: () => <ProfileAvatar />,
        headerRightContainerStyle: styles.headerRightContainer,
      }}
    >
      {/* Map tab */}
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

      {/* Scanner tab (center button) */}
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

      {/* History tab */}
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
    color: "#111827",
    fontWeight: "700",
    fontSize: 18,
  },
  headerRightContainer: {
    paddingRight: 16,
  },

  tabBar: {
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E5E7EB",
    borderTopWidth: 1,
    height: Platform.select({ ios: 84, android: 68 }),
    paddingBottom: Platform.select({ ios: 28, android: 8 }),
    paddingTop: 6,
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

  fabWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Platform.select({ ios: 14, android: 10 }),
  },
  fabCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1B4A2F",
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
    backgroundColor: "#0F2419",
    borderColor: "#D1FAE5",
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 10,
  },
});
