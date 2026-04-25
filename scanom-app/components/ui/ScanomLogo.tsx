import { View, Text, StyleSheet } from "react-native";

/**
 * Scanom brand logo component — renders the logo identity inline.
 *
 * Visual:  [ 🌿 leaf icon in soft green circle ]
 *                     SCAN  om
 *          (gray "SCAN" + green "om" replicating the actual SVG logo colours)
 *
 * Replace this with <SvgUri> once react-native-svg-transformer is configured.
 */
export default function ScanomLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const scale = size === "lg" ? 1.3 : size === "sm" ? 0.75 : 1;
  const circleSize = 72 * scale;
  const leafSize = 36 * scale;
  const titleSize = 34 * scale;

  return (
    <View style={styles.wrap}>
      {/* Icon circle */}
      <View
        style={[
          styles.circle,
          { width: circleSize, height: circleSize, borderRadius: circleSize / 2 },
        ]}
      >
        {/* Leaf shapes using nested Views — approximates the SVG logo mark */}
        <View style={[styles.leaf, { width: leafSize, height: leafSize }]}>
          <View style={[styles.leafTop, { borderRadius: leafSize / 2 }]} />
          <View style={styles.leafStem} />
        </View>
      </View>

      {/* Brand wordmark: "Scan" (gray) + "om" (green) */}
      <View style={styles.wordmark}>
        <Text style={[styles.wordScan, { fontSize: titleSize }]}>Scan</Text>
        <Text style={[styles.wordOm, { fontSize: titleSize }]}>om</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
  },
  // ── Icon circle ────────────────────────────────────────────────
  circle: {
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  leaf: {
    justifyContent: "center",
    alignItems: "center",
  },
  leafTop: {
    position: "absolute",
    top: 0,
    width: "75%",
    height: "65%",
    backgroundColor: "#1B3A2D",
    transform: [{ rotate: "-15deg" }],
  },
  leafStem: {
    position: "absolute",
    bottom: 2,
    width: 3,
    height: "45%",
    backgroundColor: "#1B3A2D",
    borderRadius: 2,
  },
  // ── Wordmark ───────────────────────────────────────────────────
  wordmark: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  wordScan: {
    fontWeight: "800",
    color: "#504c4c",   // Logo gray
    letterSpacing: 0.5,
  },
  wordOm: {
    fontWeight: "800",
    color: "#1B4A2F",   // Logo dark green (old green family)
    letterSpacing: 0.5,
  },
});
