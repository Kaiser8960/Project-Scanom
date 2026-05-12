import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

const FAQ_ITEMS = [
  {
    q: "How accurate is the disease detection?",
    a: "Scanom uses a deep learning model trained on thousands of plant images. Accuracy varies by lighting, focus, and leaf condition — we recommend taking photos in natural light with the leaf clearly centered in the frame.",
  },
  {
    q: "Why does my scan show 'Not a valid leaf'?",
    a: "The system uses a confidence threshold to reject unclear or non-leaf images. Try retaking the photo with better lighting, a cleaner background, and the leaf filling most of the frame.",
  },
  {
    q: "What does the 14-day TTL on detections mean?",
    a: "Detection markers on the Risk Map automatically expire after 14 days to keep the map current. Your full scan history is still viewable in the History tab.",
  },
  {
    q: "Which plants does Scanom currently support?",
    a: "Scanom currently supports Tomato and Banana plants. Support for additional crops is planned for future updates.",
  },
  {
    q: "How is the risk level (Low / Moderate / High) calculated?",
    a: "Risk level is calculated using a fuzzy logic system that combines: number of nearby detections, disease severity, spread radius, distance from you, and current weather conditions (humidity, temperature, wind).",
  },
];

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(i: number) {
    setOpenIndex((prev) => (prev === i ? null : i));
  }

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#1B4A2F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support Center</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="help-buoy-outline" size={32} color="#1B4A2F" />
          </View>
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroSub}>Browse the FAQ below or reach us directly.</Text>
        </View>

        {/* ── FAQ ── */}
        <Text style={styles.sectionLabel}>FREQUENTLY ASKED QUESTIONS</Text>
        <View style={styles.card}>
          {FAQ_ITEMS.map((item, i) => (
            <View key={i}>
              {i > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={styles.faqRow}
                onPress={() => toggle(i)}
                activeOpacity={0.75}
              >
                <Text style={styles.faqQ}>{item.q}</Text>
                <Ionicons
                  name={openIndex === i ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
              {openIndex === i && (
                <Text style={styles.faqA}>{item.a}</Text>
              )}
            </View>
          ))}
        </View>

        {/* ── Contact ── */}
        <Text style={styles.sectionLabel}>CONTACT</Text>
        <View style={styles.card}>
          <View style={styles.contactRow}>
            <View style={styles.contactIcon}>
              <Ionicons name="mail-outline" size={20} color="#1B4A2F" />
            </View>
            <View>
              <Text style={styles.contactLabel}>Email Support</Text>
              <Text style={styles.contactSub}>support@scanom.app</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.contactRow}>
            <View style={styles.contactIcon}>
              <Ionicons name="school-outline" size={20} color="#1B4A2F" />
            </View>
            <View>
              <Text style={styles.contactLabel}>Thesis Project</Text>
              <Text style={styles.contactSub}>Computer Engineering · Thesis 2026</Text>
            </View>
          </View>
        </View>

        <Text style={styles.versionText}>Scanom v1.0 · Built for thesis demonstration</Text>

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

  hero:       { alignItems: "center", paddingVertical: 24, marginBottom: 24 },
  heroIcon:   { width: 64, height: 64, borderRadius: 20, backgroundColor: "#E8F5E9", justifyContent: "center", alignItems: "center", marginBottom: 14 },
  heroTitle:  { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 6 },
  heroSub:    { fontSize: 14, color: "#6B7280", textAlign: "center" },

  card:       { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 24, overflow: "hidden" },
  divider:    { height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 16 },

  faqRow:     { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  faqQ:       { flex: 1, fontSize: 14, fontWeight: "600", color: "#111827", lineHeight: 21 },
  faqA:       { fontSize: 13, color: "#6B7280", lineHeight: 20, paddingHorizontal: 16, paddingBottom: 14 },

  contactRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  contactIcon:{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#E8F5E9", justifyContent: "center", alignItems: "center" },
  contactLabel:{ fontSize: 15, fontWeight: "600", color: "#111827" },
  contactSub: { fontSize: 13, color: "#6B7280", marginTop: 2 },

  versionText:{ textAlign: "center", fontSize: 12, color: "#D1D5DB", marginTop: 8 },
});
