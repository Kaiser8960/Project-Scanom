/**
 * Edit Profile screen — lets the user update their display name and location.
 * Accessible by tapping the avatar in the header → "Edit Profile" menu item.
 */

import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getStoredUser, saveSession, getStoredToken } from "@/services/auth";
import { updateProfile } from "@/services/api";
import type { User } from "@/types";
import RuleChecklist from "@/components/ui/RuleChecklist";
import { LIMITS, allOk, nameRules, locationRules } from "@/utils/validation";

export default function EditProfileScreen() {
  const router = useRouter();

  const [user,     setUser]     = useState<User | null>(null);
  const [name,     setName]     = useState("");
  const [location, setLocation] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [focus,    setFocus]    = useState<"name" | "location" | null>(null);
  const [touched,  setTouched]  = useState({ name: false, location: false });
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    getStoredUser().then((u) => {
      if (u) {
        setUser(u);
        setName(u.name ?? "");
        setLocation(u.location ?? "");
      }
    });
  }, []);

  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  // Live validation (mirrors server rules)
  const normName      = name.replace(/\s+/g, " ").trim();
  const nameChanged   = normName !== (user?.name ?? "");
  const nameR         = nameRules(name);
  const locationR     = locationRules(location);
  // Only insist on a valid name if the user actually changed it, so older
  // accounts can still update just their location.
  const nameBlocking  = nameChanged && !allOk(nameR);
  const formValid     = !nameBlocking && allOk(locationR);

  async function handleSave() {
    setSaveError(null);
    if (!formValid) {
      setTouched({ name: true, location: true });
      return;
    }
    setSaving(true);
    try {
      const payload: { name?: string; location?: string } = {
        location: location.replace(/\s+/g, " ").trim(),
      };
      if (nameChanged) payload.name = normName;
      const result = await updateProfile(payload);
      // Update stored user so the header avatar reflects the change immediately
      const token = await getStoredToken();
      if (token) await saveSession(token, result.user);
      Alert.alert("Saved", "Your profile has been updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      setSaveError(e.message ?? "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Header ── */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1B4A2F" />
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Edit Profile</Text>
        <Text style={styles.subtitle}>Update your display name and region.</Text>

        {/* ── Avatar ── */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        </View>

        {/* ── Email (read-only) ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={[styles.input, styles.inputDisabled]}>
            <Ionicons name="mail-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
            <Text style={styles.inputTextDisabled}>{user?.email ?? "—"}</Text>
          </View>
          <Text style={styles.hint}>Email cannot be changed.</Text>
        </View>

        {/* ── Name ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Display Name</Text>
          <View style={[styles.input, nameBlocking && (touched.name || nameR.some((r) => !r.ok && r.live)) && styles.inputError]}>
            <Ionicons name="person-outline" size={18} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.inputText}
              value={name}
              onChangeText={setName}
              onFocus={() => setFocus("name")}
              onBlur={() => { setTouched((t) => ({ ...t, name: true })); setFocus((f) => (f === "name" ? null : f)); }}
              placeholder="Your full name"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={LIMITS.NAME_MAX}
              returnKeyType="next"
            />
          </View>
          {nameChanged && (focus === "name" || touched.name) && (
            <RuleChecklist
              rules={nameR}
              empty={name.length === 0}
              flagged={touched.name}
              collapsed={focus !== "name"}
            />
          )}
        </View>

        {/* ── Location ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Region / Location</Text>
          <View style={[styles.input, !allOk(locationR) && styles.inputError]}>
            <Ionicons name="location-outline" size={18} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.inputText}
              value={location}
              onChangeText={setLocation}
              onFocus={() => setFocus("location")}
              onBlur={() => { setTouched((t) => ({ ...t, location: true })); setFocus((f) => (f === "location" ? null : f)); }}
              placeholder="e.g. Cebu City, Philippines"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              maxLength={LIMITS.LOCATION_MAX}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>
          {!allOk(locationR) && (
            <RuleChecklist rules={locationR} empty={location.length === 0} flagged />
          )}
          <Text style={styles.hint}>Used for localized risk forecasting context.</Text>
        </View>

        {saveError ? (
          <View style={styles.banner} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle" size={18} color="#B91C1C" />
            <Text style={styles.bannerText}>{saveError}</Text>
          </View>
        ) : null}

        {/* ── Save button ── */}
        <TouchableOpacity
          style={[styles.saveBtn, (saving || !formValid) && styles.saveBtnDisabled]}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.saveBtnText}>Save Changes</Text>
          }
        </TouchableOpacity>

      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: "#F5F7F5" },
  scroll:           { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48 },

  backBtn:          { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 20 },
  backLabel:        { color: "#1B4A2F", fontSize: 15, fontWeight: "600" },

  title:            { fontSize: 24, fontWeight: "800", color: "#111827", marginBottom: 4 },
  subtitle:         { fontSize: 14, color: "#6B7280", marginBottom: 32 },

  avatarWrap:       { alignItems: "center", marginBottom: 32 },
  avatar:           { width: 80, height: 80, borderRadius: 40, backgroundColor: "#1B4A2F", justifyContent: "center", alignItems: "center" },
  avatarInitials:   { color: "#FFFFFF", fontSize: 30, fontWeight: "800" },

  fieldGroup:       { marginBottom: 20 },
  label:            { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },

  input:            { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 14, paddingVertical: 14 },
  inputDisabled:    { backgroundColor: "#F9FAFB" },
  inputIcon:        { marginRight: 10 },
  inputText:        { flex: 1, fontSize: 15, color: "#111827" },
  inputTextDisabled:{ flex: 1, fontSize: 15, color: "#9CA3AF" },

  inputError:       { borderColor: "#B91C1C" },

  banner:           { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", borderRadius: 10, padding: 10, marginBottom: 4 },
  bannerText:       { color: "#B91C1C", fontSize: 13, flexShrink: 1 },

  hint:             { fontSize: 12, color: "#9CA3AF", marginTop: 6 },

  saveBtn:          { backgroundColor: "#1B4A2F", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 12 },
  saveBtnDisabled:  { opacity: 0.6 },
  saveBtnText:      { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
