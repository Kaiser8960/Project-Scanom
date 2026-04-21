import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator,
  ScrollView, TouchableOpacity,
} from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";
import { useFocusEffect } from "expo-router";
import { getCurrentLocation, DEFAULT_LOCATION } from "@/services/location";
import { getDetectionsNearby, getRiskSummary } from "@/services/api";
import type { NearbyDetection, RiskSummary, Coordinates } from "@/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  high: "rgba(239, 68, 68,  0.25)",
  moderate: "rgba(234, 179, 8,  0.20)",
  low: "rgba(74,  222, 128, 0.15)",
};
const RISK_BORDER: Record<string, string> = {
  high: "#EF4444",
  moderate: "#EAB308",
  low: "#4ADE80",
};
const RISK_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  none: { bg: "#1A2E22", text: "#4ADE80", label: "No Active Cases" },
  low: { bg: "#14532D", text: "#4ADE80", label: "Low Risk" },
  moderate: { bg: "#713F12", text: "#EAB308", label: "Moderate Risk" },
  high: { bg: "#7F1D1D", text: "#EF4444", label: "High Risk" },
};

type FilterKey = "all" | "tomato" | "banana" | "high" | "moderate" | "low";

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "tomato", label: "🍅 Tomato" },
  { key: "banana", label: "🍌 Banana" },
  { key: "high", label: "🔴 High" },
  { key: "moderate", label: "🟡 Moderate" },
  { key: "low", label: "🟢 Low" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const [location, setLocation] = useState<Coordinates>(DEFAULT_LOCATION);
  const [detections, setDetections] = useState<NearbyDetection[]>([]);
  const [riskSummary, setRiskSummary] = useState<RiskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<NearbyDetection | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    setLoading(true);
    try {
      const loc = await getCurrentLocation() ?? DEFAULT_LOCATION;
      setLocation(loc);

      const [nearbyResp, summary] = await Promise.all([
        getDetectionsNearby(loc.lat, loc.lng),
        getRiskSummary(loc.lat, loc.lng),
      ]);
      setDetections(nearbyResp.detections ?? []);
      setRiskSummary(summary);
    } catch (e) {
      console.warn("Map load error:", e);
    } finally {
      setLoading(false);
    }
  }

  // Client-side filter — no extra API calls needed
  const filteredDetections = useMemo(() => {
    switch (activeFilter) {
      case "tomato": return detections.filter(d => d.plant === "tomato");
      case "banana": return detections.filter(d => d.plant === "banana");
      case "high": return detections.filter(d => d.risk_level === "high");
      case "moderate": return detections.filter(d => d.risk_level === "moderate");
      case "low": return detections.filter(d => d.risk_level === "low");
      default: return detections;
    }
  }, [detections, activeFilter]);

  const badge = RISK_BADGE[riskSummary?.area_risk_level ?? "none"];

  return (
    <View style={styles.container}>
      {/* ── Risk banner ── */}
      <View style={[styles.banner, { backgroundColor: badge.bg }]}>
        <Text style={[styles.bannerLevel, { color: badge.text }]}>
          {badge.label}
        </Text>
        {riskSummary && riskSummary.total_cases_nearby > 0 && (
          <Text style={styles.bannerSub}>
            {riskSummary.total_cases_nearby} detection
            {riskSummary.total_cases_nearby !== 1 ? "s" : ""} within 5km
            {riskSummary.dominant_disease_display
              ? ` · ${riskSummary.dominant_disease_display}`
              : ""}
          </Text>
        )}
      </View>

      {/* ── Filter chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        {FILTER_OPTIONS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.filterChip,
              activeFilter === key && styles.filterChipActive,
            ]}
            onPress={() => {
              setActiveFilter(key);
              setSelected(null);
            }}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.filterLabel,
                activeFilter === key && styles.filterLabelActive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Map ── */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#4ADE80" />
          <Text style={styles.loaderText}>Loading map…</Text>
        </View>
      ) : (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.lat,
            longitude: location.lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation
          showsMyLocationButton
          onPress={() => setSelected(null)}
        >
          {/* Risk circles */}
          {filteredDetections.map((d) => (
            <Circle
              key={d.id}
              center={{ latitude: d.lat, longitude: d.lng }}
              radius={d.spread_radius ?? 200}
              fillColor={RISK_COLORS[d.risk_level] ?? RISK_COLORS.low}
              strokeColor={RISK_BORDER[d.risk_level] ?? RISK_BORDER.low}
              strokeWidth={1.5}
              onPress={() => setSelected(d)}
            />
          ))}

          {/* Markers for each detection */}
          {filteredDetections.map((d) => (
            <Marker
              key={`m-${d.id}`}
              coordinate={{ latitude: d.lat, longitude: d.lng }}
              pinColor={RISK_BORDER[d.risk_level] ?? "#4ADE80"}
              onPress={() => setSelected(d)}
            />
          ))}
        </MapView>
      )}

      {/* ── Selected detection callout card ── */}
      {selected && (
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={[styles.infoRiskDot, { backgroundColor: RISK_BORDER[selected.risk_level] }]} />
            <Text style={styles.infoDisease}>{selected.disease_display}</Text>
            <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.infoMeta}>
            {selected.plant.charAt(0).toUpperCase() + selected.plant.slice(1)}
            {"  ·  "}
            <Text style={{ color: RISK_BORDER[selected.risk_level] }}>
              {selected.risk_level.charAt(0).toUpperCase() + selected.risk_level.slice(1)} Risk
            </Text>
          </Text>
          {selected.spread_radius > 0 && (
            <Text style={styles.infoRadius}>Spread radius: {selected.spread_radius}m</Text>
          )}
          {selected.distance_km != null && (
            <Text style={styles.infoRadius}>{selected.distance_km.toFixed(1)} km away</Text>
          )}
          <Text style={styles.infoDate}>
            {new Date(selected.created_at).toLocaleDateString("en-PH", {
              year: "numeric", month: "short", day: "numeric",
            })}
          </Text>
        </View>
      )}

      {/* ── Legend (only when no card selected) ── */}
      {!selected && (
        <View style={styles.legend}>
          {[["high", "High"], ["moderate", "Moderate"], ["low", "Low"]].map(([key, label]) => (
            <View key={key} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: RISK_BORDER[key] }]} />
              <Text style={styles.legendLabel}>{label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F2419" },
  banner: { padding: 14, paddingHorizontal: 18 },
  bannerLevel: { fontSize: 15, fontWeight: "700" },
  bannerSub: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },

  // Filter bar
  filterBar: { maxHeight: 52, backgroundColor: "#0F2419" },
  filterContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: "row" },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "#1A2E22", borderWidth: 1, borderColor: "#2D4A38" },
  filterChipActive: { backgroundColor: "#14532D", borderColor: "#4ADE80" },
  filterLabel: { color: "#9CA3AF", fontSize: 13, fontWeight: "500" },
  filterLabelActive: { color: "#4ADE80", fontWeight: "700" },

  // Map
  map: { flex: 1 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loaderText: { color: "#9CA3AF", fontSize: 14 },

  // Callout card
  infoCard: { position: "absolute", bottom: 24, left: 16, right: 16, backgroundColor: "#1A2E22", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#2D4A38", shadowColor: "#000", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 5 },
  infoHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  infoRiskDot: { width: 10, height: 10, borderRadius: 5 },
  infoDisease: { flex: 1, color: "#F0FDF4", fontWeight: "700", fontSize: 15 },
  closeBtn: { padding: 4 },
  closeBtnText: { color: "#6B7280", fontSize: 14 },
  infoMeta: { color: "#9CA3AF", fontSize: 13, marginBottom: 2 },
  infoRadius: { color: "#6B7280", fontSize: 12, marginTop: 2 },
  infoDate: { color: "#6B7280", fontSize: 12, marginTop: 4 },

  // Legend
  legend: { position: "absolute", bottom: 24, right: 16, backgroundColor: "#1A2E22", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "#2D4A38" },
  legendRow: { flexDirection: "row", alignItems: "center", marginVertical: 3 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendLabel: { color: "#D1FAE5", fontSize: 12 },
});
