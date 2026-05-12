import { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Platform, Image,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getCurrentLocation, DEFAULT_LOCATION } from "@/services/location";
import { detect } from "@/services/api";

const ZOOM_LEVELS = [
  { label: "1×", value: 0.0  },
  { label: "2×", value: 0.10 },
  { label: "3×", value: 0.20 },
];

export default function ScanScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [zoomIndex, setZoomIndex]     = useState(0);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  async function takePicture() {
    if (!cameraRef.current || processing) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false, quality: 0.9 });
      if (!photo?.uri) return;
      // Center-square crop at capture time — preview shows exactly what model receives
      const squareSize = Math.min(photo.width, photo.height);
      const cropX = Math.round((photo.width  - squareSize) / 2);
      const cropY = Math.round((photo.height - squareSize) / 2);
      const cropped = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ crop: { originX: cropX, originY: cropY, width: squareSize, height: squareSize } }],
        { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 }
      );
      setCapturedUri(cropped.uri);
    } catch (e) {
      Alert.alert("Camera error", "Failed to capture photo.");
    }
  }

  async function handleUsePhoto() {
    if (!capturedUri) return;
    setProcessing(true);
    await processImage(capturedUri); // already cropped at capture time
    setCapturedUri(null);
    setProcessing(false);
  }

  function handleRetake() {
    setCapturedUri(null);
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setProcessing(true);
      await processImage(result.assets[0].uri);
      setProcessing(false);
    }
  }

  async function processImage(uri: string) {
    try {
      // Camera flow: uri is already cropped to the frame — just resize.
      // Gallery flow: uri is the full image — resize the whole thing.
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

  // ── Preview: bordered square showing exactly what the model will analyze ──────
  if (capturedUri) {
    return (
      <View style={styles.container}>
        <View style={styles.previewContainer}>
          <View style={styles.previewBorder}>
            <Image source={{ uri: capturedUri }} style={{ flex: 1 }} resizeMode="cover" />
          </View>
        </View>

        <View style={styles.previewLabelWrap}>
          <Text style={styles.previewLabel}>Review your photo</Text>
          <Text style={styles.previewSub}>The green box is what the model analyzes.</Text>
        </View>

        <View style={styles.previewBar}>
          <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake} disabled={processing}>
            <Ionicons name="refresh-outline" size={22} color="#1B4A2F" />
            <Text style={styles.retakeBtnText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.usePhotoBtn} onPress={handleUsePhoto} disabled={processing}>
            {processing
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <><Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" /><Text style={styles.usePhotoBtnText}>Use Photo</Text></>
            }
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Live camera ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* CameraView + overlay as siblings inside cameraArea to avoid children warning */}
      <View style={styles.cameraArea}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          zoom={ZOOM_LEVELS[zoomIndex].value}
          autofocus="on"
          onBarcodeScanned={undefined}
        />
        <View style={styles.overlay} pointerEvents="box-none">
          {/* Corner-bracket frame — 88% width matches center-square crop area */}
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.hint}>Align leaf within the frame</Text>
          <View style={styles.zoomRow}>
            {ZOOM_LEVELS.map((z, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.zoomPill, zoomIndex === i && styles.zoomPillActive]}
                onPress={() => setZoomIndex(i)}
                activeOpacity={0.75}
              >
                <Text style={[styles.zoomPillText, zoomIndex === i && styles.zoomPillTextActive]}>
                  {z.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Gallery processing overlay ── */}
        {processing && (
          <View style={styles.processingOverlay}>
            <View style={styles.processingCard}>
              <ActivityIndicator size="large" color="#1B4A2F" />
              <Text style={styles.processingTitle}>Analyzing image…</Text>
              <Text style={styles.processingSubtitle}>Running disease detection</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.sideBtn} onPress={pickFromGallery} disabled={processing}>
          <Ionicons name="images-outline" size={28} color={processing ? "#9CA3AF" : "#1B4A2F"} />
          <Text style={[styles.sideBtnLabel, processing && { color: "#9CA3AF" }]}>Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shutter} onPress={takePicture} disabled={processing} activeOpacity={0.85}>
          <View style={styles.shutterInner} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.sideBtn} onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))} disabled={processing}>
          <Ionicons name="camera-reverse-outline" size={28} color={processing ? "#9CA3AF" : "#1B4A2F"} />
          <Text style={[styles.sideBtnLabel, processing && { color: "#9CA3AF" }]}>Flip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#000000" },

  // ── Camera area
  cameraArea:   { flex: 1, position: "relative" },
  overlay:      { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },

  // Corner-bracket scan frame
  scanFrame:    { width: "88%", aspectRatio: 1, position: "relative" },
  corner:       { position: "absolute", width: 30, height: 30 },
  cornerTL:     { top: 0, left: 0,  borderTopWidth: 3, borderLeftWidth: 3,  borderTopLeftRadius: 5,     borderColor: "#1B4A2F" },
  cornerTR:     { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 5,    borderColor: "#1B4A2F" },
  cornerBL:     { bottom: 0, left: 0,  borderBottomWidth: 3, borderLeftWidth: 3,  borderBottomLeftRadius: 5,  borderColor: "#1B4A2F" },
  cornerBR:     { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 5, borderColor: "#1B4A2F" },

  hint:         { color: "#FFFFFF", fontSize: 13, marginTop: 18, backgroundColor: "rgba(27,74,47,0.80)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },

  // Zoom pills
  zoomRow:      { flexDirection: "row", gap: 10, marginTop: 20 },
  zoomPill:     { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.50)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  zoomPillActive:    { backgroundColor: "rgba(27,74,47,0.90)", borderColor: "#4CAF50" },
  zoomPillText:      { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  zoomPillTextActive:{ color: "#FFFFFF" },

  // Controls bar
  controls:     { flexDirection: "row", alignItems: "center", justifyContent: "space-around", backgroundColor: "#FFFFFF", paddingVertical: 24, paddingBottom: 36, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  shutter:      { width: 72, height: 72, borderRadius: 36, backgroundColor: "#1B4A2F", justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#E8F5E9" },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#FFFFFF" },
  sideBtn:      { alignItems: "center", width: 70 },
  sideBtnLabel: { color: "#1B4A2F", fontSize: 11, marginTop: 4, fontWeight: "600" },

  // Permission screen
  permissionContainer: { flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center", padding: 32 },
  permissionTitle:     { color: "#111827", fontSize: 20, fontWeight: "700", marginTop: 20, marginBottom: 12 },
  permissionText:      { color: "#504c4c", fontSize: 14, textAlign: "center", lineHeight: 22 },
  permissionBtn:       { marginTop: 24, backgroundColor: "#1B4A2F", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
  permissionBtnText:   { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },

  // Review / preview screen
  previewContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000000" },
  previewBorder:    { width: "90%", aspectRatio: 1, borderWidth: 3, borderColor: "#1B4A2F", borderRadius: 10, overflow: "hidden" },
  previewLabelWrap: { position: "absolute", top: 60, left: 0, right: 0, alignItems: "center" },
  previewLabel:     { color: "#FFFFFF", fontSize: 18, fontWeight: "700", backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, overflow: "hidden" },
  previewSub:       { color: "#FFFFFF", fontSize: 12, marginTop: 6, backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 14, paddingVertical: 5, borderRadius: 16, overflow: "hidden" },
  previewBar:       { flexDirection: "row", backgroundColor: "#FFFFFF", paddingVertical: 20, paddingBottom: 36, paddingHorizontal: 24, gap: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  retakeBtn:        { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 2, borderColor: "#1B4A2F", borderRadius: 14, paddingVertical: 14 },
  retakeBtnText:    { color: "#1B4A2F", fontWeight: "700", fontSize: 15 },
  usePhotoBtn:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1B4A2F", borderRadius: 14, paddingVertical: 14 },
  usePhotoBtnText:  { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },

  // Gallery processing overlay
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center", zIndex: 99 },
  processingCard:    { backgroundColor: "#FFFFFF", borderRadius: 20, paddingVertical: 32, paddingHorizontal: 40, alignItems: "center", gap: 12, shadowColor: "#000", shadowOpacity: 0.25, shadowOffset: { width: 0, height: 4 }, shadowRadius: 16, elevation: 10 },
  processingTitle:   { color: "#111827", fontSize: 16, fontWeight: "700", marginTop: 4 },
  processingSubtitle:{ color: "#6B7280", fontSize: 13 },
});
