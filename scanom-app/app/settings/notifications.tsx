import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [scanAlerts, setScanAlerts]     = useState(true);
  const [riskAlerts, setRiskAlerts]     = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#1B4A2F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── Section: Alerts ── */}
        <Text style={styles.sectionLabel}>SCAN ALERTS</Text>
        <View style={styles.card}>
          <ToggleRow
            icon="leaf-outline"
            label="Scan Detection Alerts"
            sublabel="Notify when a new disease is detected near you"
            value={scanAlerts}
            onToggle={setScanAlerts}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="warning-outline"
            label="High Risk Warnings"
            sublabel="Immediate alert when risk level in your area is High"
            value={riskAlerts}
            onToggle={setRiskAlerts}
          />
        </View>

        {/* ── Section: Reports ── */}
        <Text style={styles.sectionLabel}>REPORTS</Text>
        <View style={styles.card}>
          <ToggleRow
            icon="document-text-outline"
            label="Weekly Summary"
            sublabel="Receive a weekly report of nearby disease activity"
            value={weeklyReport}
            onToggle={setWeeklyReport}
          />
        </View>

        {/* ── Info notice ── */}
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={16} color="#1B4A2F" />
          <Text style={styles.noticeText}>
            Push notification delivery is subject to your device's system notification settings.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

// ── Toggle row sub-component ────────────────────────────────────────────────
function ToggleRow({
  icon,
  label,
  sublabel,
  value,
  onToggle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleIcon}>
        <Ionicons name={icon} size={20} color="#1B4A2F" />
      </View>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleSub}>{sublabel}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#E5E7EB", true: "#A7C8B0" }}
        thumbColor={value ? "#1B4A2F" : "#D1D5DB"}
        ios_backgroundColor="#E5E7EB"
      />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  backBtn:     { width: 38, height: 38, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },

  body:        { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
  sectionLabel:{ fontSize: 11, fontWeight: "700", color: "#9CA3AF", letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },

  card:  { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 24, overflow: "hidden" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 16 },

  toggleRow:  { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  toggleIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#E8F5E9", justifyContent: "center", alignItems: "center" },
  toggleText: { flex: 1 },
  toggleLabel:{ fontSize: 15, fontWeight: "600", color: "#111827" },
  toggleSub:  { fontSize: 12, color: "#6B7280", marginTop: 2, lineHeight: 17 },

  notice:     { flexDirection: "row", gap: 8, backgroundColor: "#E8F5E9", borderRadius: 12, padding: 14, alignItems: "flex-start" },
  noticeText: { flex: 1, fontSize: 13, color: "#1B4A2F", lineHeight: 19 },
});
