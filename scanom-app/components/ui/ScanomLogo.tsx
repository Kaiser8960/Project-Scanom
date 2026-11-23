import { View, StyleSheet } from "react-native";
import ScanomSvg from "@/assets/scanom-logo.svg";

/**
 * Scanom SVG logo component (sizes: sm, md, lg).
 */
export default function ScanomLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const width = size === "lg" ? 320 : size === "sm" ? 200 : 442;
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
