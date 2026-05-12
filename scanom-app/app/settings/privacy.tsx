import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [locationSharing, setLocationSharing] = useState(true);
  const [anonymousData,   setAnonymousData]   = useState(true);

  function handleDeleteData() {
    Alert.alert(
      "Delete My Data",
      "This will permanently remove all your scans and detection history. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => Alert.alert("Request Submitted", "Your data deletion request has been submitted.") },
      ]
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#1B4A2F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── Location ── */}
        <Text style={styles.sectionLabel}>LOCATION DATA</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleIcon}>
              <Ionicons name="location-outline" size={20} color="#1B4A2F" />
            </View>
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>Location Sharing</Text>
              <Text style={styles.toggleSub}>Allow Scanom to tag your scans with GPS coordinates for the risk map</Text>
            </View>
            <Switch
              value={locationSharing}
              onValueChange={setLocationSharing}
              trackColor={{ false: "#E5E7EB", true: "#A7C8B0" }}
              thumbColor={locationSharing ? "#1B4A2F" : "#D1D5DB"}
              ios_backgroundColor="#E5E7EB"
            />
          </View>
        </View>

        {/* ── Data ── */}
        <Text style={styles.sectionLabel}>DATA & ANALYTICS</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleIcon}>
              <Ionicons name="analytics-outline" size={20} color="#1B4A2F" />
            </View>
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>Anonymous Usage Data</Text>
              <Text style={styles.toggleSub}>Help improve Scanom by sharing anonymous scan statistics</Text>
            </View>
            <Switch
              value={anonymousData}
              onValueChange={setAnonymousData}
              trackColor={{ false: "#E5E7EB", true: "#A7C8B0" }}
              thumbColor={anonymousData ? "#1B4A2F" : "#D1D5DB"}
              ios_backgroundColor="#E5E7EB"
            />
          </View>
          <View style={styles.divider} />
          {/* Data retention info */}
          <View style={styles.infoRow}>
            <View style={styles.toggleIcon}>
              <Ionicons name="time-outline" size={20} color="#1B4A2F" />
            </View>
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>Detection Data Retention</Text>
              <Text style={styles.toggleSub}>Your detection records are automatically removed after 14 days from the public map</Text>
            </View>
          </View>
        </View>

        {/* ── Danger zone ── */}
        <Text style={styles.sectionLabel}>ACCOUNT DATA</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.dangerRow} onPress={handleDeleteData} activeOpacity={0.7}>
            <View style={[styles.toggleIcon, { backgroundColor: "#FEE2E2" }]}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </View>
            <View style={styles.toggleText}>
              <Text style={[styles.toggleLabel, { color: "#EF4444" }]}>Delete All My Data</Text>
              <Text style={styles.toggleSub}>Permanently remove all your scans and history</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

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

  card:       { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 24, overflow: "hidden" },
  divider:    { height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 16 },

  toggleRow:  { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  infoRow:    { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  dangerRow:  { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  toggleIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#E8F5E9", justifyContent: "center", alignItems: "center" },
  toggleText: { flex: 1 },
  toggleLabel:{ fontSize: 15, fontWeight: "600", color: "#111827" },
  toggleSub:  { fontSize: 12, color: "#6B7280", marginTop: 2, lineHeight: 17 },
});
