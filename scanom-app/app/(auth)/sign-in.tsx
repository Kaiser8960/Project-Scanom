import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { signIn } from "@/services/auth";

export default function SignInScreen() {
  const router   = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    try {
      setLoading(true);
      await signIn(email.trim(), password);
      router.replace("/(tabs)/map");
    } catch (err: any) {
      Alert.alert("Login failed", err.message ?? "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo / Branding */}
        <View style={styles.brand}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>🌿</Text>
          </View>
          <Text style={styles.appName}>Scanom</Text>
          <Text style={styles.tagline}>Plant Disease Detection</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#6B7280"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#6B7280"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Sign In</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: "#0F2419" },
  scroll:       { flexGrow: 1, justifyContent: "center", padding: 24 },
  brand:        { alignItems: "center", marginBottom: 36 },
  logoCircle:   { width: 72, height: 72, borderRadius: 36, backgroundColor: "#1B3A2D", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  logoText:     { fontSize: 36 },
  appName:      { fontSize: 32, fontWeight: "700", color: "#F0FDF4", letterSpacing: 1 },
  tagline:      { fontSize: 13, color: "#6B7280", marginTop: 4 },
  card:         { backgroundColor: "#1A2E22", borderRadius: 20, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: "#2D4A38" },
  title:        { fontSize: 22, fontWeight: "700", color: "#F0FDF4", marginBottom: 4 },
  subtitle:     { fontSize: 14, color: "#9CA3AF", marginBottom: 24 },
  inputGroup:   { marginBottom: 16 },
  label:        { fontSize: 13, fontWeight: "600", color: "#9CA3AF", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input:        { backgroundColor: "#243B2F", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: "#F0FDF4", fontSize: 15, borderWidth: 1, borderColor: "#2D4A38" },
  btn:          { backgroundColor: "#1B3A2D", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8, borderWidth: 1, borderColor: "#4ADE80" },
  btnDisabled:  { opacity: 0.6 },
  btnText:      { color: "#4ADE80", fontSize: 16, fontWeight: "700", letterSpacing: 0.5 },
  footer:       { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText:   { color: "#6B7280", fontSize: 14 },
  footerLink:   { color: "#4ADE80", fontSize: 14, fontWeight: "600" },
});
