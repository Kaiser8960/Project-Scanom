import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { resolveDetection } from "@/services/api";
import type { DetectionResult } from "@/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const RISK_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  none:     { color: "#4ADE80", label: "No Risk",        icon: "checkmark-circle-outline" },
  low:      { color: "#4ADE80", label: "Low Risk",       icon: "checkmark-circle-outline" },
  moderate: { color: "#EAB308", label: "Moderate Risk",  icon: "warning-outline" },
  high:     { color: "#EF4444", label: "High Risk",      icon: "alert-circle-outline" },
};
const RISK_FILL: Record<string, string> = {
  high:     "rgba(239, 68, 68,  0.25)",
  moderate: "rgba(234, 179, 8,  0.20)",
  low:      "rgba(74,  222, 128, 0.15)",
  none:     "rgba(74,  222, 128, 0.10)",
};
const RISK_BORDER: Record<string, string> = {
  high: "#EF4444", moderate: "#EAB308", low: "#4ADE80", none: "#4ADE80",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ResultScreen() {
  const router = useRouter();
  const { data, fromHistory } = useLocalSearchParams<{ data: string; fromHistory?: string }>();

  // Parse the result — works for both fresh DetectionResult and HistoryDetection
  const result = JSON.parse(data ?? "{}") as DetectionResult & {
    id?: string;
    created_at?: string;
    status?: "active" | "resolved";
  };

  const [resolving,  setResolving]  = useState(false);
  const [isResolved, setIsResolved] = useState(result.status === "resolved");

  const isFromHistory = fromHistory === "true";
  const risk          = RISK_CONFIG[result.risk_level ?? "none"];
  const isGood        = result.is_healthy;

  // The detection's DB id — present for history items and fresh scans that were saved
  const detectionId = result.id ?? result.detection_id ?? null;

  // ── Mini-map visibility ────────────────────────────────────────────────────
  const showMiniMap =
    !isGood &&
    result.lat != null &&
    result.lng != null &&
    result.spread_radius > 0;

  // ── Mark as Cured handler ──────────────────────────────────────────────────
  async function handleMarkCured() {
    if (!detectionId) return;

    Alert.alert(
      "Mark as Cured",
      "This will remove the risk circle from the public map. The scan record is kept for historical data. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "default",
          onPress: async () => {
            try {
              setResolving(true);
              await resolveDetection(detectionId);
              setIsResolved(true);
              Alert.alert(
                "Done ✓",
                "Detection marked as resolved. The risk circle has been removed from the map.",
                [{ text: "OK", onPress: () => router.back() }]
              );
            } catch (e: any) {
              Alert.alert("Error", e.message ?? "Failed to resolve detection.");
            } finally {
              setResolving(false);
            }
          },
        },
      ]
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#4ADE80" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isFromHistory ? "Past Scan" : "Scan Result"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Resolved banner (only shown after marking cured or if already resolved) */}
      {isResolved && (
        <View style={styles.resolvedBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#4ADE80" />
          <Text style={styles.resolvedText}>Marked as Cured — Removed from Map</Text>
        </View>
      )}

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

      {/* ── Mini-map: Spread Forecast Card ── */}
      {showMiniMap && (
        <View style={styles.miniMapCard}>
          <Text style={styles.sectionTitle}>SPREAD FORECAST</Text>
          <MapView
            style={styles.miniMap}
            region={{
              latitude:       result.lat,
              longitude:      result.lng,
              latitudeDelta:  (result.spread_radius / 111000) * 3,
              longitudeDelta: (result.spread_radius / 111000) * 3,
            }}
            scrollEnabled
            zoomEnabled
            pitchEnabled={false}
            rotateEnabled={false}
            showsUserLocation={false}
          >
            <Circle
              center={{ latitude: result.lat, longitude: result.lng }}
              radius={result.spread_radius}
              fillColor={RISK_FILL[result.risk_level ?? "low"]}
              strokeColor={RISK_BORDER[result.risk_level ?? "low"]}
              strokeWidth={2}
            />
            <Marker
              coordinate={{ latitude: result.lat, longitude: result.lng }}
              pinColor={RISK_BORDER[result.risk_level ?? "low"]}
            />
          </MapView>
          <Text style={styles.miniMapCaption}>
            Risk radius: {result.spread_radius}m · Pinch to zoom
          </Text>
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
      {(result.timestamp || result.created_at) && (
        <Text style={styles.timestamp}>
          Scanned {new Date(result.timestamp ?? result.created_at!).toLocaleString("en-PH")}
        </Text>
      )}

      {/* ── Mark as Cured button (only from History, only if active) ── */}
      {isFromHistory && !isGood && !isResolved && detectionId && (
        <TouchableOpacity
          style={styles.curedBtn}
          onPress={handleMarkCured}
          activeOpacity={0.85}
          disabled={resolving}
        >
          {resolving ? (
            <ActivityIndicator color="#0F2419" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#0F2419" />
              <Text style={styles.curedBtnText}>✓ Mark as Cured / Treated</Text>
            </>
          )}
        </TouchableOpacity>
      )}

    </ScrollView>
  );
}

// ── Section helper ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: "#0F2419" },
  content:        { padding: 16, paddingBottom: 48 },
  header:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  backBtn:        { padding: 6 },
  headerTitle:    { color: "#F0FDF4", fontWeight: "700", fontSize: 17 },

  // Resolved state banner
  resolvedBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#14532D", borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#4ADE80" },
  resolvedText:   { color: "#4ADE80", fontSize: 13, fontWeight: "600" },

  // Disease card
  diseaseCard:    { backgroundColor: "#1A2E22", borderRadius: 18, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: "#2D4A38", alignItems: "center" },
  plantBadge:     { backgroundColor: "#243B2F", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 10 },
  plantText:      { color: "#4ADE80", fontSize: 12, fontWeight: "600" },
  diseaseName:    { color: "#F0FDF4", fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  confidenceRow:  { flexDirection: "row", alignItems: "center", gap: 4 },
  confidenceText: { color: "#9CA3AF", fontSize: 13 },

  // Risk card
  riskCard:       { flexDirection: "row", alignItems: "center", backgroundColor: "#1A2E22", borderRadius: 14, padding: 16, gap: 14, marginBottom: 12, borderWidth: 1 },
  riskInfo:       { flex: 1 },
  riskLevel:      { fontSize: 16, fontWeight: "700" },
  riskRadius:     { color: "#9CA3AF", fontSize: 12, marginTop: 3 },

  // Weather
  weatherRow:     { flexDirection: "row", gap: 12, marginBottom: 16 },
  weatherItem:    { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#1A2E22", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#2D4A38" },
  weatherText:    { color: "#D1FAE5", fontSize: 13 },

  // Mini-map
  miniMapCard:    { backgroundColor: "#1A2E22", borderRadius: 14, overflow: "hidden", marginBottom: 12, borderWidth: 1, borderColor: "#2D4A38" },
  miniMap:        { width: "100%", height: 200 },
  miniMapCaption: { color: "#6B7280", fontSize: 11, textAlign: "center", paddingVertical: 8 },

  // AI sections
  section:        { backgroundColor: "#1A2E22", borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#2D4A38" },
  sectionTitle:   { color: "#4ADE80", fontWeight: "700", fontSize: 13, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  bodyText:       { color: "#D1FAE5", fontSize: 14, lineHeight: 22 },
  bulletRow:      { flexDirection: "row", gap: 8, marginBottom: 6, alignItems: "flex-start" },
  bullet:         { color: "#4ADE80", fontSize: 16, lineHeight: 22 },
  bulletText:     { flex: 1, color: "#D1FAE5", fontSize: 14, lineHeight: 22 },
  stepNum:        { width: 22, height: 22, borderRadius: 11, backgroundColor: "#1B3A2D", justifyContent: "center", alignItems: "center" },
  stepNumText:    { color: "#4ADE80", fontSize: 11, fontWeight: "700" },

  // Timestamp
  timestamp:      { color: "#4B5563", fontSize: 12, textAlign: "center", marginTop: 12, marginBottom: 16 },

  // Mark as Cured button
  curedBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#4ADE80", borderRadius: 14, paddingVertical: 16, paddingHorizontal: 24, marginTop: 8 },
  curedBtnText:   { color: "#0F2419", fontWeight: "700", fontSize: 15 },
});
