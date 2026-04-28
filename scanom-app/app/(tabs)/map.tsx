import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, Animated, Modal, Pressable,
} from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { getCurrentLocation, DEFAULT_LOCATION } from "@/services/location";
import { getDetectionsNearby, getRiskSummary } from "@/services/api";
import type { NearbyDetection, RiskSummary, Coordinates } from "@/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  high:     "rgba(239, 68,  68,  0.25)",
  moderate: "rgba(234, 179, 8,   0.20)",
  low:      "rgba(74,  222, 128, 0.15)",
};
const RISK_BORDER: Record<string, string> = {
  high:     "#EF4444",
  moderate: "#EAB308",
  low:      "#4ADE80",
};
const RISK_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  none:     { bg: "#E8F5E9", text: "#025f00", label: "No Active Cases" },
  low:      { bg: "#E8F5E9", text: "#025f00", label: "Low Risk" },
  moderate: { bg: "#FEF9C3", text: "#854D0E", label: "Moderate Risk" },
  high:     { bg: "#FEE2E2", text: "#B91C1C", label: "High Risk" },
};

type FilterKey = "all" | "tomato" | "banana" | "high" | "moderate" | "low";

type FilterOption = {
  key: FilterKey;
  label: string;
  dot?: string; // colour for risk dot
};

const PLANT_FILTERS: FilterOption[] = [
  { key: "tomato",   label: "Tomato" },
  { key: "banana",   label: "Banana" },
];
const RISK_FILTERS: FilterOption[] = [
  { key: "high",     label: "High",     dot: "#EF4444" },
  { key: "moderate", label: "Moderate", dot: "#EAB308" },
  { key: "low",      label: "Low",      dot: "#4ADE80" },
];

function filterLabel(key: FilterKey): string {
  if (key === "all") return "Filter";
  const all = [...PLANT_FILTERS, ...RISK_FILTERS];
  return all.find((f) => f.key === key)?.label ?? "Filter";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const [location, setLocation]         = useState<Coordinates>(DEFAULT_LOCATION);
  const [detections, setDetections]     = useState<NearbyDetection[]>([]);
  const [riskSummary, setRiskSummary]   = useState<RiskSummary | null>(null);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState<NearbyDetection | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [dropOpen, setDropOpen]         = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => { loadData(); }, [])
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

  function openDrop() {
    setDropOpen(true);
    Animated.timing(fadeAnim, { toValue: 1, duration: 160, useNativeDriver: true }).start();
  }
  function closeDrop() {
    Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() =>
      setDropOpen(false)
    );
  }
  function applyFilter(key: FilterKey) {
    setActiveFilter(key);
    setSelected(null);
    closeDrop();
  }

  const filteredDetections = useMemo(() => {
    switch (activeFilter) {
      case "tomato":   return detections.filter((d) => d.plant === "tomato");
      case "banana":   return detections.filter((d) => d.plant === "banana");
      case "high":     return detections.filter((d) => d.risk_level === "high");
      case "moderate": return detections.filter((d) => d.risk_level === "moderate");
      case "low":      return detections.filter((d) => d.risk_level === "low");
      default:         return detections;
    }
  }, [detections, activeFilter]);

  const badge = RISK_BADGE[riskSummary?.area_risk_level ?? "none"];
  const isFiltered = activeFilter !== "all";

  return (
    <View style={styles.container}>

      {/* ── Risk banner ── */}
      <View style={[styles.banner, { backgroundColor: badge.bg }]}>
        <Text style={[styles.bannerLevel, { color: badge.text }]}>{badge.label}</Text>
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

      {/* ── Filter button row ── */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, isFiltered && styles.filterBtnActive]}
          onPress={dropOpen ? closeDrop : openDrop}
          activeOpacity={0.8}
        >
          <Ionicons
            name="options-outline"
            size={15}
            color={isFiltered ? "#FFFFFF" : "#1B4A2F"}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.filterBtnText, isFiltered && styles.filterBtnTextActive]}>
            {filterLabel(activeFilter)}
          </Text>
          <Ionicons
            name={dropOpen ? "chevron-up" : "chevron-down"}
            size={14}
            color={isFiltered ? "#FFFFFF" : "#1B4A2F"}
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>

        {/* Clear filter pill — only when active */}
        {isFiltered && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => applyFilter("all")}
            activeOpacity={0.7}
          >
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Dropdown panel ── */}
      {dropOpen && (
        <Animated.View style={[styles.dropdown, { opacity: fadeAnim }]}>
          {/* Plant group */}
          <Text style={styles.dropGroupLabel}>PLANT</Text>
          {PLANT_FILTERS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.dropItem, activeFilter === key && styles.dropItemActive]}
              onPress={() => applyFilter(key as FilterKey)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dropItemText, activeFilter === key && styles.dropItemTextActive]}>
                {label}
              </Text>
              {activeFilter === key && (
                <Ionicons name="checkmark" size={14} color="#1B4A2F" />
              )}
            </TouchableOpacity>
          ))}

          <View style={styles.dropDivider} />

          {/* Risk group */}
          <Text style={styles.dropGroupLabel}>RISK LEVEL</Text>
          {RISK_FILTERS.map(({ key, label, dot }) => (
            <TouchableOpacity
              key={key}
              style={[styles.dropItem, activeFilter === key && styles.dropItemActive]}
              onPress={() => applyFilter(key as FilterKey)}
              activeOpacity={0.7}
            >
              <View style={[styles.dropDot, { backgroundColor: dot }]} />
              <Text style={[styles.dropItemText, activeFilter === key && styles.dropItemTextActive]}>
                {label}
              </Text>
              {activeFilter === key && (
                <Ionicons name="checkmark" size={14} color="#1B4A2F" />
              )}
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}

      {/* Tap outside dropdown to close */}
      {dropOpen && (
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrop} />
      )}

      {/* ── Map ── */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#025f00" />
          <Text style={styles.loaderText}>Loading map…</Text>
        </View>
      ) : (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude:      location.lat,
            longitude:     location.lng,
            latitudeDelta:  0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation
          showsMyLocationButton
          onPress={() => setSelected(null)}
        >
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
              <Ionicons name="close" size={16} color="#6B7280" />
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
          {(["high", "Moderate", "low"] as const).map((key) => {
            const k = key.toLowerCase() as "high" | "moderate" | "low";
            return (
              <View key={k} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: RISK_BORDER[k] }]} />
                <Text style={styles.legendLabel}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: "#FFFFFF" },
  banner:     { padding: 14, paddingHorizontal: 18 },
  bannerLevel:{ fontSize: 15, fontWeight: "700" },
  bannerSub:  { fontSize: 12, color: "#504c4c", marginTop: 2 },

  // Filter row
  filterRow:  { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, gap: 8, backgroundColor: "#FFFFFF" },
  filterBtn:  { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: "#1B4A2F", backgroundColor: "#FFFFFF" },
  filterBtnActive: { backgroundColor: "#1B4A2F" },
  filterBtnText: { color: "#1B4A2F", fontSize: 13, fontWeight: "600" },
  filterBtnTextActive: { color: "#FFFFFF" },
  clearBtn:   { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "#D1D5DB", backgroundColor: "#F9FAFB" },
  clearBtnText: { color: "#6B7280", fontSize: 12, fontWeight: "500" },

  // Dropdown
  dropdown:   { position: "absolute", top: 120, left: 14, zIndex: 100, backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", paddingVertical: 8, paddingHorizontal: 4, minWidth: 180, shadowColor: "#000", shadowOpacity: 0.10, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 8 },
  dropGroupLabel: { fontSize: 10, fontWeight: "700", color: "#9CA3AF", letterSpacing: 0.8, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 4 },
  dropItem:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, gap: 8 },
  dropItemActive: { backgroundColor: "#E8F5E9" },
  dropItemText: { flex: 1, fontSize: 14, color: "#111827", fontWeight: "500" },
  dropItemTextActive: { color: "#1B4A2F", fontWeight: "700" },
  dropDot:    { width: 10, height: 10, borderRadius: 5 },
  dropDivider:{ height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 12, marginVertical: 4 },

  // Map
  map:        { flex: 1 },
  loader:     { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loaderText: { color: "#504c4c", fontSize: 14 },

  // Callout card
  infoCard:   { position: "absolute", bottom: 24, left: 16, right: 16, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#D1E8D8", shadowColor: "#1B4A2F", shadowOpacity: 0.10, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 5 },
  infoHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  infoRiskDot:{ width: 10, height: 10, borderRadius: 5 },
  infoDisease:{ flex: 1, color: "#111827", fontWeight: "700", fontSize: 15 },
  closeBtn:   { padding: 4 },
  infoMeta:   { color: "#504c4c", fontSize: 13, marginBottom: 2 },
  infoRadius: { color: "#6B7280", fontSize: 12, marginTop: 2 },
  infoDate:   { color: "#6B7280", fontSize: 12, marginTop: 4 },

  // Legend
  legend:     { position: "absolute", bottom: 24, right: 16, backgroundColor: "#FFFFFF", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "#D1E8D8", shadowColor: "#1B4A2F", shadowOpacity: 0.08, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 3 },
  legendRow:  { flexDirection: "row", alignItems: "center", marginVertical: 3 },
  legendDot:  { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendLabel:{ color: "#111827", fontSize: 12 },
});
