import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const TIPS = [
  "Make sure the full leaf is visible in the frame",
  "Avoid blurry or out-of-focus images",
  "Use natural daylight — avoid harsh shadows",
  "Scan only tomato or banana leaves (other plants are not supported)",
  "Make sure the leaf isn't covered by soil or water droplets",
];

export default function RejectionScreen() {
  const router = useRouter();
  const { confidence } = useLocalSearchParams<{ confidence?: string }>();
  const pct = confidence ? (parseFloat(confidence) * 100).toFixed(1) : "–";

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>

      {/* Icon */}
      <View style={styles.iconWrap}>
        <Ionicons name="leaf-outline" size={64} color="#4B5563" />
      </View>

      {/* Message */}
      <Text style={styles.title}>Unable to Identify</Text>
      <Text style={styles.subtitle}>
        The scan confidence was too low ({pct}%) to make a reliable diagnosis.
        This usually means the image quality or leaf positioning needs to be adjusted.
      </Text>

      {/* Tips */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>Tips for a better scan</Text>
        {TIPS.map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#4ADE80" />
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => router.back()}
        activeOpacity={0.85}
      >
        <Ionicons name="camera-outline" size={18} color="#0F2419" />
        <Text style={styles.primaryBtnText}>Try Again</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => router.replace("/(tabs)/map")}
        activeOpacity={0.85}
      >
        <Text style={styles.secondaryBtnText}>Go to Map</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F2419" },
  content: { flexGrow: 1, padding: 28, paddingTop: 48, alignItems: "center" },
  iconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#1A2E22", justifyContent: "center", alignItems: "center", marginBottom: 24 },
  title: { color: "#F0FDF4", fontSize: 24, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  subtitle: { color: "#9CA3AF", fontSize: 14, lineHeight: 22, textAlign: "center", marginBottom: 28 },
  tipsCard: { backgroundColor: "#1A2E22", borderRadius: 16, padding: 18, width: "100%", borderWidth: 1, borderColor: "#2D4A38", marginBottom: 28, gap: 12 },
  tipsTitle: { color: "#4ADE80", fontWeight: "700", fontSize: 13, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  tipText: { flex: 1, color: "#D1FAE5", fontSize: 13, lineHeight: 20 },
  primaryBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#4ADE80", borderRadius: 14, paddingVertical: 15, paddingHorizontal: 32, width: "100%", justifyContent: "center", marginBottom: 12 },
  primaryBtnText: { color: "#0F2419", fontWeight: "700", fontSize: 15 },
  secondaryBtn: { paddingVertical: 12 },
  secondaryBtnText: { color: "#6B7280", fontSize: 14 },
});
