import { View, StyleSheet } from "react-native";
import ScanomSvg from "@/assets/scanom-logo.svg";

/**
 * Scanom brand logo component — renders the actual SVG logo asset.
 * Sizes: sm = 120px wide, md = 160px wide, lg = 200px wide
 */
export default function ScanomLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const width = size === "lg" ? 320 : size === "sm" ? 200 : 442;
  // Preserve the SVG's natural aspect ratio (logo is wider than tall)
  const height = width * 0.42;

  return (
    <View style={styles.wrap}>
      <ScanomSvg width={width} height={height} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
