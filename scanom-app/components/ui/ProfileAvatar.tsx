import { useRef, useState, useCallback } from "react";
import {
  TouchableOpacity, View, Text, StyleSheet, Image,
} from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getStoredUser, signOut } from "@/services/auth";
import type { User } from "@/types";

/**
 * Floating profile avatar shown in the header of every tab screen.
 * Tap → opens a bottom sheet with user info + settings + logout.
 */
export default function ProfileAvatar() {
  const router    = useRouter();
  const sheetRef  = useRef<BottomSheet>(null);
  const [user, setUser]   = useState<User | null>(null);
  const [open, setOpen]   = useState(false);

  async function handlePress() {
    const u = await getStoredUser();
    setUser(u);
    sheetRef.current?.expand();
    setOpen(true);
  }

  function handleClose() {
    sheetRef.current?.close();
    setOpen(false);
  }

  async function handleLogout() {
    handleClose();
    await signOut();
    router.replace("/(auth)/sign-in");
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <>
      {/* Avatar button */}
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={styles.avatar}
      >
        {user?.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
        ) : (
          <Text style={styles.initials}>{initials}</Text>
        )}
      </TouchableOpacity>

      {/* Bottom sheet */}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={["45%"]}
        enablePanDownToClose
        onClose={() => setOpen(false)}
        backgroundStyle={styles.sheet}
        handleIndicatorStyle={styles.indicator}
      >
        <BottomSheetView style={styles.sheetContent}>

          {/* User info */}
          <View style={styles.userRow}>
            <View style={styles.sheetAvatar}>
              <Text style={styles.sheetInitials}>{initials}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name ?? "—"}</Text>
              <Text style={styles.userLocation}>{user?.location ?? "—"}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Settings rows */}
          <MenuItem icon="notifications-outline" label="Notifications" />
          <MenuItem icon="lock-closed-outline"   label="Privacy & Security" />
          <MenuItem icon="help-circle-outline"   label="Support Center" />

          <View style={styles.divider} />

          {/* Logout */}
          <TouchableOpacity style={styles.row} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={[styles.rowLabel, styles.rowLabelRed]}>Logout</Text>
          </TouchableOpacity>

        </BottomSheetView>
      </BottomSheet>
    </>
  );
}

function MenuItem({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7}>
      <Ionicons name={icon} size={20} color="#9CA3AF" />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#4B5563" style={styles.chevron} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  avatar:        { width: 36, height: 36, borderRadius: 18, backgroundColor: "#1B3A2D", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#4ADE80" },
  avatarImg:     { width: 36, height: 36, borderRadius: 18 },
  initials:      { color: "#4ADE80", fontWeight: "700", fontSize: 14 },
  sheet:         { backgroundColor: "#1A2E22" },
  indicator:     { backgroundColor: "#4ADE80" },
  sheetContent:  { flex: 1, padding: 20 },
  userRow:       { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  sheetAvatar:   { width: 52, height: 52, borderRadius: 26, backgroundColor: "#1B3A2D", justifyContent: "center", alignItems: "center", marginRight: 14 },
  sheetInitials: { color: "#4ADE80", fontWeight: "700", fontSize: 18 },
  userInfo:      { flex: 1 },
  userName:      { color: "#F0FDF4", fontWeight: "700", fontSize: 16 },
  userLocation:  { color: "#9CA3AF", fontSize: 13, marginTop: 2 },
  divider:       { height: 1, backgroundColor: "#243B2F", marginVertical: 12 },
  row:           { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  rowLabel:      { flex: 1, color: "#D1FAE5", fontSize: 15, marginLeft: 12 },
  rowLabelRed:   { color: "#EF4444" },
  chevron:       { marginLeft: "auto" },
});
