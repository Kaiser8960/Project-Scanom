/**
 * Local notification service.
 * Fires on-device notifications after a scan and when the area risk is High,
 * respecting the toggles saved in Settings → Notifications (AsyncStorage).
 */

import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  scanAlerts: "scanom_notif_scan_alerts",
  riskAlerts: "scanom_notif_risk_alerts",
  lastRiskWarning: "scanom_last_risk_warning_at",
};

const RISK_WARNING_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

// Show banner + sound even while the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function isEnabled(key: string, defaultVal = true): Promise<boolean> {
  const val = await AsyncStorage.getItem(key);
  return val === null ? defaultVal : val === "true";
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

/** Fired right after a diseased leaf is detected. */
export async function sendScanNotification(
  diseaseName: string,
  riskLevel: string,
  plantName: string
): Promise<void> {
  try {
    if (!(await isEnabled(KEYS.scanAlerts))) return;
    if (!(await requestNotificationPermission())) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Disease detected: ${diseaseName}`,
        body: `${plantName} scan shows ${riskLevel} risk. Open Scanom for treatment steps.`,
        data: { type: "scan_result" },
      },
      trigger: null,
    });
  } catch (e) {
    console.warn("Scan notification failed:", e);
  }
}

/** Fired when the nearby area risk is High (max once per hour). */
export async function sendRiskWarning(
  diseaseName: string,
  caseCount: number
): Promise<void> {
  try {
    if (!(await isEnabled(KEYS.riskAlerts))) return;

    const last = Number((await AsyncStorage.getItem(KEYS.lastRiskWarning)) ?? 0);
    if (Date.now() - last < RISK_WARNING_COOLDOWN_MS) return;

    if (!(await requestNotificationPermission())) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "High risk in your area",
        body: `${caseCount} active case${caseCount === 1 ? "" : "s"} of ${diseaseName} reported nearby. Take precautions.`,
        data: { type: "risk_warning" },
      },
      trigger: null,
    });
    await AsyncStorage.setItem(KEYS.lastRiskWarning, String(Date.now()));
  } catch (e) {
    console.warn("Risk warning failed:", e);
  }
}
