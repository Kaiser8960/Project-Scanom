import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, TouchableOpacity,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getUserDetections } from "@/services/api";
import type { HistoryDetection } from "@/types";

const RISK_COLORS: Record<string, string> = {
  none: "#4ADE80",
  low: "#4ADE80",
  moderate: "#EAB308",
  high: "#EF4444",
};

export default function HistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryDetection[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setPage(0);
      loadHistory(0, true);
    }, [])
  );

  async function loadHistory(offset = 0, reset = false) {
    try {
      setLoading(true);
      const resp = await getUserDetections(20, offset);
      if (reset) {
        setHistory(resp.detections);
      } else {
        setHistory((prev) => [...prev, ...resp.detections]);
      }
      setHasMore(resp.detections.length === 20);
    } catch {
      // Not logged in or network error — show empty state
    } finally {
      setLoading(false);
    }
  }

  function loadMore() {
    if (!hasMore || loading) return;
    const next = page + 1;
    setPage(next);
    loadHistory(next * 20);
  }

  if (loading && history.length === 0) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#4ADE80" />
      </View>
    );
  }

  if (!loading && history.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="leaf-outline" size={64} color="#2D4A38" />
        <Text style={styles.emptyTitle}>No Scans Yet</Text>
        <Text style={styles.emptyText}>
          Tap the scan button to detect plant diseases.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={history}
      keyExtractor={(item) => item.id ?? item.detection_id ?? Math.random().toString()}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: "/result",
              params: { data: JSON.stringify(item), fromHistory: "true" },
            })
          }
        >
          {/* Left: risk color strip */}
          <View
            style={[styles.strip, { backgroundColor: RISK_COLORS[item.risk_level] ?? "#4ADE80" }]}
          />
          <View style={styles.cardBody}>
            <Text style={styles.cardDisease}>{item.disease_display}</Text>
            <Text style={styles.cardMeta}>
              {item.plant.charAt(0).toUpperCase() + item.plant.slice(1)}
              {"  ·  "}
              <Text style={{ color: RISK_COLORS[item.risk_level] }}>
                {item.risk_level.charAt(0).toUpperCase() + item.risk_level.slice(1)} Risk
              </Text>
            </Text>
            <Text style={styles.cardDate}>
              {new Date(item.created_at ?? item.timestamp).toLocaleDateString("en-PH", {
                year: "numeric", month: "short", day: "numeric",
              })}
            </Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.confidence}>
              {(item.confidence * 100).toFixed(0)}%
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#4B5563" />
          </View>
        </TouchableOpacity>
      )}
      ListFooterComponent={
        loading && history.length > 0
          ? <ActivityIndicator color="#4ADE80" style={{ marginVertical: 16 }} />
          : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#0F2419" },
  loader: { flex: 1, backgroundColor: "#0F2419", justifyContent: "center", alignItems: "center" },
  empty: { flex: 1, backgroundColor: "#0F2419", justifyContent: "center", alignItems: "center", padding: 40 },
  emptyTitle: { color: "#F0FDF4", fontSize: 20, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  emptyText: { color: "#6B7280", fontSize: 14, textAlign: "center", lineHeight: 22 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#1A2E22", borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "#2D4A38" },
  strip: { width: 5, alignSelf: "stretch" },
  cardBody: { flex: 1, padding: 14 },
  cardDisease: { color: "#F0FDF4", fontWeight: "700", fontSize: 15, marginBottom: 3 },
  cardMeta: { color: "#9CA3AF", fontSize: 12 },
  cardDate: { color: "#6B7280", fontSize: 12, marginTop: 4 },
  cardRight: { paddingRight: 14, alignItems: "center", gap: 4 },
  confidence: { color: "#4ADE80", fontWeight: "700", fontSize: 14 },
});
