import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signUp } from "@/services/auth";
import ScanomLogo from "@/components/ui/ScanomLogo";
import RuleChecklist from "@/components/ui/RuleChecklist";
import {
  LIMITS, allOk, nameRules, emailRules, passwordRules, confirmRules,
} from "@/utils/validation";

type FieldKey = "name" | "email" | "password" | "confirm";

export default function SignUpScreen() {
  const router = useRouter();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);

  const [focus, setFocus]     = useState<FieldKey | null>(null);
  const [touched, setTouched] = useState<Record<FieldKey, boolean>>({
    name: false, email: false, password: false, confirm: false,
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Errors that only the server can know (e.g. email already registered)
  const [emailServerError, setEmailServerError] = useState<string | null>(null);
  const [formError, setFormError]               = useState<string | null>(null);

  // ── live validation ────────────────────────────────────────────────────────
  const nameR    = nameRules(name);
  const emailR   = emailRules(email);
  const passR    = passwordRules(password);
  const confirmR = confirmRules(password, confirm);

  const nameOk    = allOk(nameR);
  const emailOk   = allOk(emailR);
  const passOk    = allOk(passR);
  const confirmOk = allOk(confirmR);
  const formValid = nameOk && emailOk && passOk && confirmOk;

  const flagged = (k: FieldKey) => touched[k] || submitAttempted;
  const touch   = (k: FieldKey) => setTouched((t) => ({ ...t, [k]: true }));

  function onBlur(k: FieldKey) {
    touch(k);
    setFocus((f) => (f === k ? null : f));
  }

  /** Border color: red = problem shown, green = valid, gray = neutral. */
  function borderFor(k: FieldKey, value: string, ok: boolean, rules: typeof nameR, extraError = false) {
    if (extraError) return styles.inputError;
    if (value.length === 0) return flagged(k) ? styles.inputError : null;
    const hasVisibleFail = rules.some((r) => !r.ok && (r.live || flagged(k)));
    if (hasVisibleFail) return styles.inputError;
    if (ok) return styles.inputOk;
    return null;
  }

  async function handleRegister() {
    setFormError(null);
    if (!formValid) {
      // Reveal every problem at once instead of one popup at a time
      setSubmitAttempted(true);
      return;
    }
    try {
      setLoading(true);
      // location defaults to empty string — GPS coordinates are used instead
      await signUp(name.replace(/\s+/g, " ").trim(), "", email.trim(), password);
      router.replace("/(tabs)/map");
    } catch (err: any) {
      const msg: string = err?.message ?? "Registration failed. Please try again.";
      if (/email|already exists|already registered/i.test(msg)) {
        setEmailServerError(msg);
      } else {
        setFormError(msg);
      }
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

        {/* Back button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Logo header — matches sign-in layout */}
        <View style={styles.logoArea}>
          <ScanomLogo size="md" />
          <Text style={styles.subtitle}>Create your account</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Account</Text>
          <Text style={styles.cardSub}>Join Scanom to track plant diseases</Text>

          {/* NAME */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={[styles.input, borderFor("name", name, nameOk, nameR)]}
              placeholder="Juan Dela Cruz"
              placeholderTextColor="#6B7280"
              value={name}
              onChangeText={setName}
              onFocus={() => setFocus("name")}
              onBlur={() => onBlur("name")}
              maxLength={LIMITS.NAME_MAX}
              autoCapitalize="words"
              autoCorrect={false}
            />
            {(focus === "name" || name.length > 0 || flagged("name")) && (
              <RuleChecklist
                rules={nameR}
                empty={name.length === 0}
                flagged={flagged("name")}
                collapsed={focus !== "name"}
              />
            )}
          </View>

          {/* EMAIL */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, borderFor("email", email, emailOk, emailR, !!emailServerError)]}
              placeholder="you@example.com"
              placeholderTextColor="#6B7280"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={(t) => { setEmail(t); setEmailServerError(null); }}
              onFocus={() => setFocus("email")}
              onBlur={() => onBlur("email")}
              maxLength={LIMITS.EMAIL_MAX}
            />
            {(focus === "email" || email.length > 0 || flagged("email")) && (
              <RuleChecklist
                rules={emailR}
                empty={email.length === 0}
                flagged={flagged("email")}
                collapsed={focus !== "email"}
              />
            )}
            {emailServerError ? (
              <View style={styles.inlineError}>
                <Ionicons name="close-circle" size={16} color="#B91C1C" />
                <Text style={styles.inlineErrorText}>{emailServerError}</Text>
              </View>
            ) : null}
          </View>

          {/* PASSWORD */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputWrap, borderFor("password", password, passOk, passR)]}>
              <TextInput
                style={styles.inputInner}
                placeholder="Create a password"
                placeholderTextColor="#6B7280"
                secureTextEntry={!showPw}
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocus("password")}
                onBlur={() => onBlur("password")}
                maxLength={LIMITS.PASSWORD_MAX}
              />
              <TouchableOpacity
                onPress={() => setShowPw((s) => !s)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={showPw ? "Hide password" : "Show password"}
              >
                <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {(focus === "password" || password.length > 0 || flagged("password")) && (
              <RuleChecklist
                title="Your password must contain:"
                rules={passR}
                empty={password.length === 0}
                flagged={flagged("password")}
                collapsed={focus !== "password"}
              />
            )}
          </View>

          {/* CONFIRM PASSWORD */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={[styles.inputWrap, borderFor("confirm", confirm, confirmOk, confirmR)]}>
              <TextInput
                style={styles.inputInner}
                placeholder="Re-enter password"
                placeholderTextColor="#6B7280"
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoCorrect={false}
                value={confirm}
                onChangeText={setConfirm}
                onFocus={() => setFocus("confirm")}
                onBlur={() => onBlur("confirm")}
                maxLength={LIMITS.PASSWORD_MAX}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm((s) => !s)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={showConfirm ? "Hide password" : "Show password"}
              >
                <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {(confirm.length > 0 || flagged("confirm")) && (
              <RuleChecklist
                rules={confirmR}
                empty={confirm.length === 0}
                flagged={flagged("confirm") || confirm.length >= password.length}
              />
            )}
          </View>

          {formError ? (
            <View style={styles.banner} accessibilityLiveRegion="polite">
              <Ionicons name="alert-circle" size={18} color="#B91C1C" />
              <Text style={styles.bannerText}>{formError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.btn, (loading || !formValid) && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
            accessibilityHint={formValid ? undefined : "Some fields need attention. Tap to see what to fix."}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Create Account</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: "#FFFFFF" },
  scroll:      { flexGrow: 1, padding: 24, paddingTop: 4 },

  backBtn:     { marginBottom: 8, marginTop: 36 },
  backText:    { color: "#1B4A2F", fontSize: 15 },

  logoArea:    { alignItems: "center", marginBottom: 8, marginTop: 4 },
  subtitle:    { fontSize: 14, color: "#6B7280", marginTop: 2 },

  card:        { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: "#E5E7EB" },
  cardTitle:   { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 4 },
  cardSub:     { fontSize: 13, color: "#6B7280", marginBottom: 20 },

  inputGroup:  { marginBottom: 16 },
  label:       { fontSize: 12, fontWeight: "600", color: "#504c4c", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input:       { backgroundColor: "#F9FAFB", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: "#111827", fontSize: 15, borderWidth: 1, borderColor: "#D1D5DB" },
  inputWrap:   { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: "#D1D5DB" },
  inputInner:  { flex: 1, paddingVertical: 14, color: "#111827", fontSize: 15 },
  inputError:  { borderColor: "#B91C1C" },
  inputOk:     { borderColor: "#15803D" },

  inlineError:     { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  inlineErrorText: { color: "#B91C1C", fontSize: 12.5, flexShrink: 1 },

  banner:      { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", borderRadius: 10, padding: 10, marginTop: 4 },
  bannerText:  { color: "#B91C1C", fontSize: 13, flexShrink: 1 },

  btn:         { backgroundColor: "#025f00", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  btnDisabled: { opacity: 0.5 },
  btnText:     { color: "#FFFFFF", fontSize: 16, fontWeight: "700", letterSpacing: 0.5 },

  footer:      { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText:  { color: "#6B7280", fontSize: 14 },
  footerLink:  { color: "#1B4A2F", fontSize: 14, fontWeight: "600" },
});
