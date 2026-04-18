import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import MapView, { Circle, Marker, UrlTile } from "react-native-maps";
import { useFocusEffect } from "expo-router";
import { getCurrentLocation, DEFAULT_LOCATION } from "@/services/location";
import { getDetectionsNearby, getRiskSummary } from "@/services/api";
import type { NearbyDetection, RiskSummary, Coordinates } from "@/types";

const RISK_COLORS: Record<string, string> = {
  high:     "rgba(239, 68, 68,  0.25)",
  moderate: "rgba(234, 179, 8,  0.20)",
  low:      "rgba(74,  222, 128, 0.15)",
};
const RISK_BORDER: Record<string, string> = {
  high:     "#EF4444",
  moderate: "#EAB308",
  low:      "#4ADE80",
};
const RISK_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  none:     { bg: "#1A2E22", text: "#4ADE80",  label: "No Active Cases" },
  low:      { bg: "#14532D", text: "#4ADE80",  label: "Low Risk" },
  moderate: { bg: "#713F12", text: "#EAB308",  label: "Moderate Risk" },
  high:     { bg: "#7F1D1D", text: "#EF4444",  label: "High Risk" },
};

export default function MapScreen() {
  const [location,    setLocation]    = useState<Coordinates>(DEFAULT_LOCATION);
  const [detections,  setDetections]  = useState<NearbyDetection[]>([]);
  const [riskSummary, setRiskSummary] = useState<RiskSummary | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState<NearbyDetection | null>(null);

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

  const badge = RISK_BADGE[riskSummary?.area_risk_level ?? "none"];

  return (
    <View style={styles.container}>
      {/* Risk banner */}
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

      {/* Map */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#4ADE80" />
          <Text style={styles.loaderText}>Loading map…</Text>
        </View>
      ) : (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude:       location.lat,
            longitude:      location.lng,
            latitudeDelta:  0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation
          showsMyLocationButton
          onPress={() => setSelected(null)}
        >
          {/* OpenStreetMap tile layer — no API key needed */}
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />

          {/* Risk circles */}
          {detections.map((d) => (
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
          {detections.map((d) => (
            <Marker
              key={`m-${d.id}`}
              coordinate={{ latitude: d.lat, longitude: d.lng }}
              pinColor={RISK_BORDER[d.risk_level] ?? "#4ADE80"}
              onPress={() => setSelected(d)}
            />
          ))}
        </MapView>
      )}

      {/* Selected detection bottom info card */}
      {selected && (
        <View style={styles.infoCard}>
          <Text style={styles.infoDisease}>{selected.disease_display}</Text>
          <Text style={styles.infoMeta}>
            {selected.risk_level.charAt(0).toUpperCase() + selected.risk_level.slice(1)} risk
            {selected.distance_km != null ? `  ·  ${selected.distance_km.toFixed(1)} km away` : ""}
          </Text>
          <Text style={styles.infoDate}>
            {new Date(selected.created_at).toLocaleDateString("en-PH", {
              year: "numeric", month: "short", day: "numeric",
            })}
          </Text>
        </View>
      )}

      {/* Legend */}
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

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#0F2419" },
  banner:      { padding: 14, paddingHorizontal: 18 },
  bannerLevel: { fontSize: 15, fontWeight: "700" },
  bannerSub:   { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  map:         { flex: 1 },
  loader:      { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loaderText:  { color: "#9CA3AF", fontSize: 14 },
  infoCard:    { position: "absolute", bottom: 24, left: 16, right: 16, backgroundColor: "#1A2E22", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#2D4A38", shadowColor: "#000", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 5 },
  infoDisease: { color: "#F0FDF4", fontWeight: "700", fontSize: 16, marginBottom: 4 },
  infoMeta:    { color: "#9CA3AF", fontSize: 13 },
  infoDate:    { color: "#6B7280", fontSize: 12, marginTop: 4 },
  legend:      { position: "absolute", bottom: 24, right: 16, backgroundColor: "#1A2E22", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "#2D4A38" },
  legendRow:   { flexDirection: "row", alignItems: "center", marginVertical: 3 },
  legendDot:   { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendLabel: { color: "#D1FAE5", fontSize: 12 },
});
