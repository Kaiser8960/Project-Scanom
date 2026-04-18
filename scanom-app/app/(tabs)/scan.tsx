import { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Platform,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getCurrentLocation, DEFAULT_LOCATION } from "@/services/location";
import { detect } from "@/services/api";

export default function ScanScreen() {
  const router              = useRouter();
  const cameraRef           = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing]     = useState(false);
  const [facing,     setFacing]         = useState<"front" | "back">("back");

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  async function takePicture() {
    if (!cameraRef.current || processing) return;
    try {
      setProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({ base64: false, quality: 0.8 });
      if (photo?.uri) await processImage(photo.uri);
    } catch (e) {
      Alert.alert("Camera error", "Failed to capture photo.");
    } finally {
      setProcessing(false);
    }
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setProcessing(true);
      await processImage(result.assets[0].uri);
      setProcessing(false);
    }
  }

  async function processImage(uri: string) {
    try {
      // Resize to 224×224 and convert to base64
      const resized = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 224, height: 224 } }],
        { base64: true, format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 }
      );

      const loc = await getCurrentLocation() ?? DEFAULT_LOCATION;
      const result = await detect(resized.base64!, loc.lat, loc.lng);

      if (!result.valid) {
        router.push({ pathname: "/rejection", params: { confidence: String(result.confidence) } });
      } else {
        router.push({ pathname: "/result", params: { data: JSON.stringify(result) } });
      }
    } catch (err: any) {
      Alert.alert("Scan failed", err.message ?? "Please try again.");
    }
  }

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color="#4ADE80" />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          Scanom needs camera access to scan plant leaves for disease detection.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        onBarcodeScanned={undefined}
      >
        {/* Viewfinder overlay */}
        <View style={styles.overlay}>
          <View style={styles.frameOuter}>
            <View style={styles.frame} />
          </View>
          <Text style={styles.hint}>
            {processing ? "Analyzing…" : "Align leaf within the frame"}
          </Text>
        </View>
      </CameraView>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Gallery */}
        <TouchableOpacity
          style={styles.sideBtn}
          onPress={pickFromGallery}
          disabled={processing}
        >
          <Ionicons name="images-outline" size={28} color="#D1FAE5" />
          <Text style={styles.sideBtnLabel}>Gallery</Text>
        </TouchableOpacity>

        {/* Shutter */}
        <TouchableOpacity
          style={styles.shutter}
          onPress={takePicture}
          disabled={processing}
          activeOpacity={0.85}
        >
          {processing
            ? <ActivityIndicator color="#0F2419" size="large" />
            : <View style={styles.shutterInner} />
          }
        </TouchableOpacity>

        {/* Flip camera */}
        <TouchableOpacity
          style={styles.sideBtn}
          onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
          disabled={processing}
        >
          <Ionicons name="camera-reverse-outline" size={28} color="#D1FAE5" />
          <Text style={styles.sideBtnLabel}>Flip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: "#0F2419" },
  camera:              { flex: 1 },
  overlay:             { flex: 1, alignItems: "center", justifyContent: "center" },
  frameOuter:          { width: 240, height: 240, justifyContent: "center", alignItems: "center" },
  frame:               { width: 220, height: 220, borderWidth: 2, borderColor: "#4ADE80", borderRadius: 16, backgroundColor: "transparent" },
  hint:                { color: "#D1FAE5", fontSize: 13, marginTop: 16, backgroundColor: "rgba(15,36,25,0.6)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  controls:            { flexDirection: "row", alignItems: "center", justifyContent: "space-around", backgroundColor: "#0F2419", paddingVertical: 24, paddingBottom: 36 },
  shutter:             { width: 72, height: 72, borderRadius: 36, backgroundColor: "#4ADE80", justifyContent: "center", alignItems: "center", borderWidth: 4, borderColor: "#1B3A2D" },
  shutterInner:        { width: 56, height: 56, borderRadius: 28, backgroundColor: "#F0FDF4" },
  sideBtn:             { alignItems: "center", width: 70 },
  sideBtnLabel:        { color: "#9CA3AF", fontSize: 11, marginTop: 4 },
  permissionContainer: { flex: 1, backgroundColor: "#0F2419", justifyContent: "center", alignItems: "center", padding: 32 },
  permissionTitle:     { color: "#F0FDF4", fontSize: 20, fontWeight: "700", marginTop: 20, marginBottom: 12 },
  permissionText:      { color: "#9CA3AF", fontSize: 14, textAlign: "center", lineHeight: 22 },
  permissionBtn:       { marginTop: 24, backgroundColor: "#1B3A2D", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, borderWidth: 1, borderColor: "#4ADE80" },
  permissionBtnText:   { color: "#4ADE80", fontWeight: "700", fontSize: 15 },
});
