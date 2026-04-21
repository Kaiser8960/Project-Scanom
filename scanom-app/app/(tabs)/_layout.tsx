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
        tabBarStyle:             styles.tabBar,
        tabBarActiveTintColor:   "#2C5C2E",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarShowLabel:         true,
        tabBarLabelStyle:        styles.label,
        headerStyle:             styles.header,
        headerTintColor:         "#1C2E1C",
        headerTitleStyle:        styles.headerTitle,
        headerRight: () => <ProfileAvatar />,
        headerRightContainerStyle: styles.headerRightContainer,
      }}
    >
      {/* ── MAP TAB ─────────────────────────────────────────── */}
      <Tabs.Screen
        name="map"
        options={{
          title:       "Map",
          headerTitle: "Risk Map",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Ionicons name="map-outline" size={22} color={color} />
            </View>
          ),
        }}
      />

      {/* ── SCANNER (elevated center FAB) ────────────────────── */}
      <Tabs.Screen
        name="scan"
        options={{
          title:       "Scan",
          headerTitle: "Scanner",
          tabBarIcon: ({ focused }) => (
            <View style={[styles.scanFab, focused && styles.scanFabActive]}>
              <Ionicons name="camera-outline" size={26} color="#FFFFFF" />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />

      {/* ── HISTORY TAB ─────────────────────────────────────── */}
      <Tabs.Screen
        name="history"
        options={{
          title:       "History",
          headerTitle: "Scan History",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Ionicons name="time-outline" size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#FFFFFF",
    borderTopColor:  "#E5E2DB",
    borderTopWidth:  1,
    height:          68,
    paddingBottom:   8,
    paddingTop:      4,
    elevation:       8,
    shadowColor:     "#000",
    shadowOpacity:   0.08,
    shadowOffset:    { width: 0, height: -2 },
    shadowRadius:    8,
  },
  label: {
    fontSize:   11,
    fontWeight: "600",
  },
  header: {
    backgroundColor:  "#E8E5DE",
    borderBottomColor: "#DDD9D2",
    borderBottomWidth: 1,
    elevation:  0,
    shadowOpacity: 0,
  },
  headerTitle: {
    color:      "#1C2E1C",
    fontWeight: "700",
    fontSize:   18,
  },
  headerRightContainer: {
    paddingRight: 16,
  },
  // Lit pill behind active tab icon
  activeIconWrap: {
    backgroundColor: "#CCEAD0",
    borderRadius:    16,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  // Center scan FAB
  scanFab: {
    width:           56,
    height:          56,
    borderRadius:    28,
    backgroundColor: "#2C5C2E",
    justifyContent:  "center",
    alignItems:      "center",
    marginBottom:    20,
    shadowColor:     "#2C5C2E",
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.35,
    shadowRadius:    6,
    elevation:       6,
  },
  scanFabActive: {
    backgroundColor: "#1E3F20",
  },
});
