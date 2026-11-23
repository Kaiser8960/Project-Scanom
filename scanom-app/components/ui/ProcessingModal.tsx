import { Modal, View, Text, ActivityIndicator, StyleSheet } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

/**
 * Centered loading popup shown while a leaf image is being analyzed.
 */
export default function ProcessingModal({
  visible,
  title = "Analyzing image…",
  subtitle = "Running disease detection",
}: {
  visible: boolean;
  title?: string;
  subtitle?: string;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={styles.backdrop}>
        <Animated.View entering={ZoomIn.duration(220)} style={styles.card}>
          <ActivityIndicator size="large" color="#1B4A2F" />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 44,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 10,
  },
  title: { color: "#111827", fontSize: 16, fontWeight: "700", marginTop: 4 },
  subtitle: { color: "#6B7280", fontSize: 13 },
});
