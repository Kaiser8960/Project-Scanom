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
 */
export default function ProfileAvatar() {
  const router          = useRouter();
  const [visible, setVisible] = useState(false);
  const [user,    setUser]    = useState<User | null>(null);
  const slideAnim           = useRef(new Animated.Value(300)).current;

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
          <View style={{ paddingBottom: 24 }}>
            {/* Drag handle */}
            <View style={styles.handle} />

            {/* User info */}
            <View style={styles.userRow}>
              <View style={styles.bigAvatar}>
                <Text style={styles.bigInitials}>{initials}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user?.name ?? "—"}</Text>
                <Text style={styles.userSub}>{user?.location ?? "—"}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Menu items */}
            <MenuItem icon="notifications-outline" label="Notifications"   onPress={handleClose} />
            <MenuItem icon="lock-closed-outline"   label="Privacy & Security" onPress={handleClose} />
            <MenuItem icon="help-circle-outline"   label="Support Center"  onPress={handleClose} />

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
      <Ionicons name={icon} size={20} color="#9CA3AF" />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#4B5563" />
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Avatar in header
  avatar:       { width: 36, height: 36, borderRadius: 18, backgroundColor: "#1B3A2D", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#4ADE80" },
  initials:     { color: "#4ADE80", fontWeight: "700", fontSize: 14 },

  // Modal
  overlay:      { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  panel:        { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#1A2E22", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  handle:       { width: 40, height: 4, backgroundColor: "#4ADE80", borderRadius: 2, alignSelf: "center", marginBottom: 18 },

  // User info
  userRow:      { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  bigAvatar:    { width: 54, height: 54, borderRadius: 27, backgroundColor: "#243B2F", justifyContent: "center", alignItems: "center", marginRight: 14 },
  bigInitials:  { color: "#4ADE80", fontWeight: "700", fontSize: 20 },
  userInfo:     { flex: 1 },
  userName:     { color: "#F0FDF4", fontWeight: "700", fontSize: 16 },
  userSub:      { color: "#9CA3AF", fontSize: 13, marginTop: 2 },

  // Common
  divider:      { height: 1, backgroundColor: "#243B2F", marginVertical: 10 },
  row:          { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  rowLabel:     { flex: 1, color: "#D1FAE5", fontSize: 15 },
});
