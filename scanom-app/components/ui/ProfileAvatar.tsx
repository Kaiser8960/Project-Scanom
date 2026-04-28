import { useRef, useState } from "react";
import {
  TouchableOpacity, View, Text, StyleSheet,
  Modal, Animated, Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getStoredUser, signOut } from "@/services/auth";
import type { User } from "@/types";

/**
 * Floating profile avatar shown in the header of every tab screen.
 * Tap → opens a slide-up modal panel with user info, settings, and logout.
 * Styled to match the white-primary / dark-green-accent scheme.
 */
export default function ProfileAvatar() {
  const router   = useRouter();
  const [visible, setVisible] = useState(false);
  const [user, setUser]       = useState<User | null>(null);
  const slideAnim = useRef(new Animated.Value(300)).current;

  async function handleOpen() {
    const u = await getStoredUser();
    setUser(u);
    setVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }

  function handleClose() {
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  }

  async function handleLogout() {
    handleClose();
    setTimeout(async () => {
      await signOut();
      router.replace("/(auth)/sign-in");
    }, 250);
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <>
      {/* ── Avatar button in header ── */}
      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.75}
        style={styles.avatar}
      >
        <Text style={styles.initials}>{initials}</Text>
      </TouchableOpacity>

      {/* ── Slide-up modal panel ── */}
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        {/* Dim overlay */}
        <Pressable style={styles.overlay} onPress={handleClose} />

        {/* Slide-up panel */}
        <Animated.View
          style={[styles.panel, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={{ paddingBottom: 28 }}>
            {/* Drag handle */}
            <View style={styles.handle} />

            {/* User info */}
            <View style={styles.userRow}>
              <View style={styles.bigAvatar}>
                <Text style={styles.bigInitials}>{initials}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user?.name ?? "—"}</Text>
                <Text style={styles.userSub}>{user?.email ?? "—"}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Menu items */}
            <MenuItem icon="notifications-outline"  label="Notifications"    onPress={handleClose} />
            <MenuItem icon="lock-closed-outline"    label="Privacy & Security" onPress={handleClose} />
            <MenuItem icon="help-circle-outline"    label="Support Center"   onPress={handleClose} />

            <View style={styles.divider} />

            {/* Logout */}
            <TouchableOpacity style={styles.row} onPress={handleLogout} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={[styles.rowLabel, { color: "#EF4444" }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>
    </>
  );
}

// ── Menu row component ────────────────────────────────────────────────────────
function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={20} color="#1B4A2F" />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Avatar in header — dark green circle, white initials
  avatar:      { width: 36, height: 36, borderRadius: 18, backgroundColor: "#1B4A2F", justifyContent: "center", alignItems: "center" },
  initials:    { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },

  // Modal overlay
  overlay:     { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },

  // White slide-up panel
  panel:       { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20, shadowColor: "#000", shadowOpacity: 0.12, shadowOffset: { width: 0, height: -3 }, shadowRadius: 12, elevation: 12 },
  handle:      { width: 40, height: 4, backgroundColor: "#E5E7EB", borderRadius: 2, alignSelf: "center", marginBottom: 20 },

  // User info
  userRow:     { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  bigAvatar:   { width: 54, height: 54, borderRadius: 27, backgroundColor: "#1B4A2F", justifyContent: "center", alignItems: "center", marginRight: 14 },
  bigInitials: { color: "#FFFFFF", fontWeight: "700", fontSize: 20 },
  userInfo:    { flex: 1 },
  userName:    { color: "#111827", fontWeight: "700", fontSize: 16 },
  userSub:     { color: "#6B7280", fontSize: 13, marginTop: 2 },

  // Rows
  divider:     { height: 1, backgroundColor: "#F3F4F6", marginVertical: 8 },
  row:         { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  rowLabel:    { flex: 1, color: "#111827", fontSize: 15 },
});
