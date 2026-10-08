/**
 * RuleChecklist — shows live validation rules under a form field, like a
 * password guide. Each rule has an icon AND text (never color alone):
 *   ✓ green  = met
 *   ✗ red    = not met (shown once the field was left, or the problem is live)
 *   •  gray  = not met yet / nothing typed yet
 */

import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Rule } from "@/utils/validation";

type Status = "idle" | "pass" | "fail";

const COLORS = { pass: "#15803D", fail: "#B91C1C", idle: "#6B7280" };
const ICONS: Record<Status, keyof typeof Ionicons.glyphMap> = {
  pass: "checkmark-circle",
  fail: "close-circle",
  idle: "ellipse-outline",
};

function statusOf(rule: Rule, empty: boolean, flagged: boolean): Status {
  if (empty) return "idle";
  if (rule.ok) return "pass";
  return rule.live || flagged ? "fail" : "idle";
}

interface Props {
  rules: Rule[];
  /** Nothing typed yet — everything stays neutral. */
  empty: boolean;
  /** Field was left (blur) or the submit button was tapped. */
  flagged: boolean;
  /** Optional heading, e.g. "Your password must contain:" */
  title?: string;
  /** When every rule passes and the field isn't focused, show one short line. */
  collapsed?: boolean;
}

export default function RuleChecklist({ rules, empty, flagged, title, collapsed }: Props) {
  if (collapsed && !empty && rules.every((r) => r.ok)) {
    return (
      <View style={styles.okRow} accessibilityLabel="Looks good">
        <Ionicons name="checkmark-circle" size={16} color={COLORS.pass} />
        <Text style={[styles.okText]}>Looks good</Text>
      </View>
    );
  }

  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {rules.map((r) => {
        const s = statusOf(r, empty, flagged);
        return (
          <View key={r.id}>
            <View style={styles.row}>
              <Ionicons name={ICONS[s]} size={16} color={COLORS[s]} />
              <Text style={[styles.label, { color: COLORS[s] }]}>{r.label}</Text>
            </View>
            {r.children?.map((c) => {
              const cs: Status = empty ? "idle" : c.ok ? "pass" : "idle";
              return (
                <View key={c.label} style={[styles.row, styles.childRow]}>
                  <Ionicons
                    name={cs === "pass" ? "checkmark" : "remove"}
                    size={14}
                    color={COLORS[cs]}
                  />
                  <Text style={[styles.childLabel, { color: COLORS[cs] }]}>{c.label}</Text>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box:        { marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB" },
  title:      { fontSize: 12, color: "#374151", marginBottom: 6, fontWeight: "600" },
  row:        { flexDirection: "row", alignItems: "center", paddingVertical: 2, gap: 6 },
  childRow:   { marginLeft: 22 },
  label:      { fontSize: 12.5, flexShrink: 1 },
  childLabel: { fontSize: 12, flexShrink: 1 },
  okRow:      { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  okText:     { fontSize: 12.5, color: COLORS.pass, fontWeight: "600" },
});
