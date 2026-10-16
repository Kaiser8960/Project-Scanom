import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Circle, Marker } from "react-native-maps";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { resolveDetection } from "@/services/api";
import type { DetectionResult } from "@/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const RISK_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  none: { color: "#4ADE80", label: "No Risk", icon: "checkmark-circle-outline" },
  low: { color: "#4ADE80", label: "Low Risk", icon: "checkmark-circle-outline" },
  moderate: { color: "#EAB308", label: "Moderate Risk", icon: "warning-outline" },
  high: { color: "#EF4444", label: "High Risk", icon: "alert-circle-outline" },
};
const RISK_FILL: Record<string, string> = {
  high: "rgba(239, 68, 68,  0.25)",
  moderate: "rgba(234, 179, 8,  0.20)",
  low: "rgba(74,  222, 128, 0.15)",
  none: "rgba(74,  222, 128, 0.10)",
};
const RISK_BORDER: Record<string, string> = {
  high: "#EF4444", moderate: "#EAB308", low: "#4ADE80", none: "#4ADE80",
};
const SEVERITY_CONFIG: Record<string, { color: string; label: string }> = {
  mild: { color: "#16A34A", label: "Mild" },
  moderate: { color: "#CA8A04", label: "Moderate" },
  severe: { color: "#DC2626", label: "Severe" },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, fromHistory } = useLocalSearchParams<{ data: string; fromHistory?: string }>();

  // Parse the result — works for both fresh DetectionResult and HistoryDetection
  const result = JSON.parse(data ?? "{}") as DetectionResult & {
    id?: string;
    created_at?: string;
    status?: "active" | "resolved";
  };

  const [resolving, setResolving] = useState(false);
  const [isResolved, setIsResolved] = useState(result.status === "resolved");

  const isFromHistory = fromHistory === "true";
  const risk = RISK_CONFIG[result.risk_level ?? "none"];
  const isGood = result.is_healthy;
  const confidencePct = Math.max(0, Math.min(100, (result.confidence ?? 0) * 100));
  const severity = SEVERITY_CONFIG[String((result.explanation as any)?.severity ?? "").toLowerCase()];

  // The detection's DB id — present for history items and fresh scans that were saved
  const detectionId = result.id ?? result.detection_id ?? null;

  // Action bar: "Mark as Cured" for any saved, active, diseased scan; "Scan Again" for fresh scans
  const showCure = !isGood && !isResolved && !!detectionId;
  const showScanAgain = !isFromHistory;
  const showBar = showCure || showScanAgain;

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
  let step = 0; // reveal order counter

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: showBar ? 110 + insets.bottom : 48 },
        ]}
      >

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1B4A2F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isFromHistory ? "Past Scan" : "Scan Result"}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Resolved banner (only shown after marking cured or if already resolved) */}
        {isResolved && (
          <Reveal i={step++}>
            <View style={styles.resolvedBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#4ADE80" />
              <Text style={styles.resolvedText}>Marked as Cured — Removed from Map</Text>
            </View>
          </Reveal>
        )}

        {/* Disease name card — tinted by risk level */}
        <Reveal i={step++}>
          <View style={[styles.diseaseCard, { backgroundColor: risk.color + "14", borderColor: risk.color + "55" }]}>
            <View style={styles.badgeRow}>
              <View style={styles.plantBadge}>
                <Text style={styles.plantText}>
                  {result.plant?.charAt(0).toUpperCase() + (result.plant?.slice(1) ?? "")}
                </Text>
              </View>
              {!isGood && severity && (
                <View style={[styles.severityBadge, { backgroundColor: severity.color + "1F", borderColor: severity.color + "66" }]}>
                  <Text style={[styles.severityText, { color: severity.color }]}>{severity.label} severity</Text>
                </View>
              )}
            </View>
            <Text style={styles.diseaseName}>{result.disease_display}</Text>
            <View style={styles.confidenceRow}>
              <Ionicons name="analytics-outline" size={14} color="#6B7280" />
              <Text style={styles.confidenceText}>{confidencePct.toFixed(1)}% confidence</Text>
            </View>
            <View style={styles.confTrack}>
              <View style={[styles.confFill, { width: `${confidencePct}%`, backgroundColor: risk.color }]} />
            </View>
          </View>
        </Reveal>

        {/* Risk badge */}
        <Reveal i={step++}>
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
        </Reveal>

        {/* Weather context */}
        {result.weather && (
          <Reveal i={step++}>
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
          </Reveal>
        )}

        {/* ── Treatment first: what the farmer should DO ── */}
        {result.explanation && !isGood && result.explanation.treatment?.length > 0 && (
          <Reveal i={step++}>
            <Section title="Treatment" icon="medkit-outline">
              {result.explanation.treatment.map((s, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.bulletText}>{s}</Text>
                </View>
              ))}
            </Section>
          </Reveal>
        )}

        {/* ── Mini-map: Spread Forecast Card ── */}
        {showMiniMap && (
          <Reveal i={step++}>
            <View style={styles.miniMapCard}>
              <Text style={[styles.sectionTitle, styles.miniMapTitle]}>SPREAD FORECAST</Text>
              <MapView
                style={styles.miniMap}
                region={{
                  latitude: result.lat,
                  longitude: result.lng,
                  latitudeDelta: (result.spread_radius / 111000) * 3,
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
          </Reveal>
        )}

        {/* AI Explanation */}
        {result.explanation && (
          <>
            <Reveal i={step++}>
              <Section title="Overview" icon="information-circle-outline">
                <Text style={styles.bodyText}>{result.explanation.overview}</Text>
              </Section>
            </Reveal>

            <Reveal i={step++}>
              <Section title="Causes" icon="flask-outline">
                <Text style={styles.bodyText}>{result.explanation.causes}</Text>
              </Section>
            </Reveal>

            {result.explanation.prevention?.length > 0 && (
              <Reveal i={step++}>
                <Section title="Prevention" icon="shield-checkmark-outline">
                  {result.explanation.prevention.map((tip, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.bulletText}>{tip}</Text>
                    </View>
                  ))}
                </Section>
              </Reveal>
            )}
          </>
        )}

        {/* Timestamp */}
        {(result.timestamp || result.created_at) && (
          <Text style={styles.timestamp}>
            Scanned {new Date(result.timestamp ?? result.created_at!).toLocaleString("en-PH")}
          </Text>
        )}
      </ScrollView>

      {/* ── Sticky action bar (no scrolling needed to mark as cured) ── */}
      {showBar && (
        <Animated.View
          entering={FadeInDown.delay(250).duration(350)}
          style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}
        >
          {showScanAgain && (
            <TouchableOpacity
              style={[styles.barBtn, styles.barBtnOutline, !showCure && { flex: 1 }]}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Ionicons name="scan-outline" size={20} color="#1B4A2F" />
              <Text style={styles.barBtnOutlineText}>Scan Again</Text>
            </TouchableOpacity>
          )}
          {showCure && (
            <TouchableOpacity
              style={[styles.barBtn, styles.barBtnPrimary]}
              onPress={handleMarkCured}
              activeOpacity={0.85}
              disabled={resolving}
            >
              {resolving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.barBtnPrimaryText}>Mark as Cured</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </Animated.View>
      )}
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Reveal({ i, children }: { i: number; children: React.ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(i * 70).duration(380)}>
      {children}
    </Animated.View>
  );
}

function Section({
  title, icon, children,
}: { title: string; icon: React.ComponentProps<typeof Ionicons>["name"]; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={16} color="#1B4A2F" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { flex: 1 },
  content: { padding: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  backBtn: { padding: 6 },
  headerTitle: { color: "#111827", fontWeight: "700", fontSize: 17 },

  // Resolved state banner
  resolvedBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#E8F5E9", borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#D1E8D8" },
  resolvedText: { color: "#1B4A2F", fontSize: 13, fontWeight: "600" },

  // Disease card
  diseaseCard: { borderRadius: 18, padding: 20, marginBottom: 12, borderWidth: 1, alignItems: "center", shadowColor: "#1B4A2F", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 2 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  plantBadge: { backgroundColor: "#E8F5E9", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  plantText: { color: "#1B4A2F", fontSize: 12, fontWeight: "600" },
  severityBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  severityText: { fontSize: 12, fontWeight: "700" },
  diseaseName: { color: "#111827", fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  confidenceRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  confidenceText: { color: "#6B7280", fontSize: 13 },
  confTrack: { width: "100%", height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.08)", marginTop: 12, overflow: "hidden" },
  confFill: { height: "100%", borderRadius: 3 },

  // Risk card
  riskCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16, gap: 14, marginBottom: 12, borderWidth: 1 },
  riskInfo: { flex: 1 },
  riskLevel: { fontSize: 16, fontWeight: "700" },
  riskRadius: { color: "#6B7280", fontSize: 12, marginTop: 3 },

  // Weather
  weatherRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  weatherItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#D1E8D8" },
  weatherText: { color: "#374151", fontSize: 13 },

  // Mini-map
  miniMapCard: { backgroundColor: "#FFFFFF", borderRadius: 14, overflow: "hidden", marginBottom: 12, borderWidth: 1, borderColor: "#D1E8D8" },
  miniMapTitle: { padding: 14, paddingBottom: 10, marginBottom: 0 },
  miniMap: { width: "100%", height: 200 },
  miniMapCaption: { color: "#6B7280", fontSize: 11, textAlign: "center", paddingVertical: 8 },

  // AI sections
  section: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#D1E8D8" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionTitle: { color: "#1B4A2F", fontWeight: "700", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 },
  bodyText: { color: "#374151", fontSize: 14, lineHeight: 22 },
  bulletRow: { flexDirection: "row", gap: 8, marginBottom: 6, alignItems: "flex-start" },
  bullet: { color: "#1B4A2F", fontSize: 16, lineHeight: 22 },
  bulletText: { flex: 1, color: "#374151", fontSize: 14, lineHeight: 22 },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#E8F5E9", borderWidth: 1, borderColor: "#D1E8D8", justifyContent: "center", alignItems: "center" },
  stepNumText: { color: "#1B4A2F", fontSize: 11, fontWeight: "700" },

  // Timestamp
  timestamp: { color: "#9CA3AF", fontSize: 12, textAlign: "center", marginTop: 12, marginBottom: 16 },

  // Sticky action bar
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 12, paddingTop: 12, paddingHorizontal: 16, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 0, height: -2 }, shadowRadius: 4, elevation: 6 },
  barBtn: { flex: 1.4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 15 },
  barBtnOutline: { flex: 1, borderWidth: 2, borderColor: "#1B4A2F", backgroundColor: "#FFFFFF" },
  barBtnOutlineText: { color: "#1B4A2F", fontWeight: "700", fontSize: 15 },
  barBtnPrimary: { backgroundColor: "#1B4A2F" },
  barBtnPrimaryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
});
