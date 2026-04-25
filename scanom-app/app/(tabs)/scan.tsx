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
        <Ionicons name="camera-outline" size={64} color="#025f00" />
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
          <Ionicons name="images-outline" size={28} color="#1B4A2F" />
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
            ? <ActivityIndicator color="#FFFFFF" size="large" />
            : <View style={styles.shutterInner} />
          }
        </TouchableOpacity>

        {/* Flip camera */}
        <TouchableOpacity
          style={styles.sideBtn}
          onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
          disabled={processing}
        >
          <Ionicons name="camera-reverse-outline" size={28} color="#1B4A2F" />
          <Text style={styles.sideBtnLabel}>Flip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: "#FFFFFF" },
  camera:              { flex: 1 },
  overlay:             { flex: 1, alignItems: "center", justifyContent: "center" },
  frameOuter:          { width: 240, height: 240, justifyContent: "center", alignItems: "center" },
  frame:               { width: 220, height: 220, borderWidth: 2, borderColor: "#1B4A2F", borderRadius: 16, backgroundColor: "transparent" },
  hint:                { color: "#FFFFFF", fontSize: 13, marginTop: 16, backgroundColor: "rgba(27,74,47,0.80)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  controls:            { flexDirection: "row", alignItems: "center", justifyContent: "space-around", backgroundColor: "#FFFFFF", paddingVertical: 24, paddingBottom: 36, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  shutter:             { width: 72, height: 72, borderRadius: 36, backgroundColor: "#1B4A2F", justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#E8F5E9" },
  shutterInner:        { width: 56, height: 56, borderRadius: 28, backgroundColor: "#FFFFFF" },
  sideBtn:             { alignItems: "center", width: 70 },
  sideBtnLabel:        { color: "#1B4A2F", fontSize: 11, marginTop: 4, fontWeight: "600" },
  permissionContainer: { flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center", padding: 32 },
  permissionTitle:     { color: "#111827", fontSize: 20, fontWeight: "700", marginTop: 20, marginBottom: 12 },
  permissionText:      { color: "#504c4c", fontSize: 14, textAlign: "center", lineHeight: 22 },
  permissionBtn:       { marginTop: 24, backgroundColor: "#1B4A2F", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
  permissionBtnText:   { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
});
