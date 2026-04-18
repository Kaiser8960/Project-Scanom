import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { DetectionResult } from "@/types";

const RISK_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  none:     { color: "#4ADE80", label: "No Risk",        icon: "checkmark-circle-outline" },
  low:      { color: "#4ADE80", label: "Low Risk",       icon: "checkmark-circle-outline" },
  moderate: { color: "#EAB308", label: "Moderate Risk",  icon: "warning-outline" },
  high:     { color: "#EF4444", label: "High Risk",      icon: "alert-circle-outline" },
};

export default function ResultScreen() {
  const router = useRouter();
  const { data } = useLocalSearchParams<{ data: string }>();
  const result: DetectionResult = JSON.parse(data ?? "{}");

  const risk   = RISK_CONFIG[result.risk_level ?? "none"];
  const isGood = result.is_healthy;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>

      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#4ADE80" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Result</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Disease name card */}
      <View style={styles.diseaseCard}>
        <View style={styles.plantBadge}>
          <Text style={styles.plantText}>
            {result.plant?.charAt(0).toUpperCase() + (result.plant?.slice(1) ?? "")}
          </Text>
        </View>
        <Text style={styles.diseaseName}>{result.disease_display}</Text>
        <View style={styles.confidenceRow}>
          <Ionicons name="analytics-outline" size={14} color="#9CA3AF" />
          <Text style={styles.confidenceText}>
            {((result.confidence ?? 0) * 100).toFixed(1)}% confidence
          </Text>
        </View>
      </View>

      {/* Risk badge */}
      <View style={[styles.riskCard, { borderColor: risk.color + "40" }]}>
        <Ionicons name={risk.icon as any} size={28} color={risk.color} />
        <View style={styles.riskInfo}>
          <Text style={[styles.riskLevel, { color: risk.color }]}>{risk.label}</Text>
          {!isGood && result.spread_radius > 0 && (
            <Text style={styles.riskRadius}>
              Estimated spread radius: {result.spread_radius}m
            </Text>
          )}
        </View>
      </View>

      {/* Weather context */}
      {result.weather && (
        <View style={styles.weatherRow}>
          <View style={styles.weatherItem}>
            <Ionicons name="water-outline" size={16} color="#60A5FA" />
            <Text style={styles.weatherText}>{result.weather.humidity?.toFixed(0)}% humidity</Text>
          </View>
          <View style={styles.weatherItem}>
            <Ionicons name="thermometer-outline" size={16} color="#F87171" />
            <Text style={styles.weatherText}>{result.weather.temperature?.toFixed(1)}°C</Text>
          </View>
        </View>
      )}

      {/* AI Explanation */}
      {result.explanation && (
        <>
          <Section title="Overview">
            <Text style={styles.bodyText}>{result.explanation.overview}</Text>
          </Section>

          <Section title="Causes">
            <Text style={styles.bodyText}>{result.explanation.causes}</Text>
          </Section>

          {result.explanation.prevention?.length > 0 && (
            <Section title="Prevention">
              {result.explanation.prevention.map((tip, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{tip}</Text>
                </View>
              ))}
            </Section>
          )}

          {!isGood && result.explanation.treatment?.length > 0 && (
            <Section title="Treatment">
              {result.explanation.treatment.map((step, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.bulletText}>{step}</Text>
                </View>
              ))}
            </Section>
          )}
        </>
      )}

      {/* Timestamp */}
      {result.timestamp && (
        <Text style={styles.timestamp}>
          Scanned {new Date(result.timestamp).toLocaleString("en-PH")}
        </Text>
      )}

    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: "#0F2419" },
  content:       { padding: 16, paddingBottom: 40 },
  header:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backBtn:       { padding: 6 },
  headerTitle:   { color: "#F0FDF4", fontWeight: "700", fontSize: 17 },
  diseaseCard:   { backgroundColor: "#1A2E22", borderRadius: 18, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: "#2D4A38", alignItems: "center" },
  plantBadge:    { backgroundColor: "#243B2F", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 10 },
  plantText:     { color: "#4ADE80", fontSize: 12, fontWeight: "600" },
  diseaseName:   { color: "#F0FDF4", fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  confidenceRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  confidenceText:{ color: "#9CA3AF", fontSize: 13 },
  riskCard:      { flexDirection: "row", alignItems: "center", backgroundColor: "#1A2E22", borderRadius: 14, padding: 16, gap: 14, marginBottom: 12, borderWidth: 1 },
  riskInfo:      { flex: 1 },
  riskLevel:     { fontSize: 16, fontWeight: "700" },
  riskRadius:    { color: "#9CA3AF", fontSize: 12, marginTop: 3 },
  weatherRow:    { flexDirection: "row", gap: 12, marginBottom: 16 },
  weatherItem:   { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#1A2E22", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#2D4A38" },
  weatherText:   { color: "#D1FAE5", fontSize: 13 },
  section:       { backgroundColor: "#1A2E22", borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#2D4A38" },
  sectionTitle:  { color: "#4ADE80", fontWeight: "700", fontSize: 13, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  bodyText:      { color: "#D1FAE5", fontSize: 14, lineHeight: 22 },
  bulletRow:     { flexDirection: "row", gap: 8, marginBottom: 6, alignItems: "flex-start" },
  bullet:        { color: "#4ADE80", fontSize: 16, lineHeight: 22 },
  bulletText:    { flex: 1, color: "#D1FAE5", fontSize: 14, lineHeight: 22 },
  stepNum:       { width: 22, height: 22, borderRadius: 11, backgroundColor: "#1B3A2D", justifyContent: "center", alignItems: "center" },
  stepNumText:   { color: "#4ADE80", fontSize: 11, fontWeight: "700" },
  timestamp:     { color: "#4B5563", fontSize: 12, textAlign: "center", marginTop: 12 },
});
