import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

export const CONFIG = {
  API_BASE_URL:           process.env.EXPO_PUBLIC_API_URL        ?? "http://192.168.1.100:8000",
  SUPABASE_URL:           process.env.EXPO_PUBLIC_SUPABASE_URL   ?? "",
  SUPABASE_ANON_KEY:      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  CONFIDENCE_THRESHOLD:   parseFloat(process.env.EXPO_PUBLIC_CONFIDENCE_THRESHOLD ?? "0.70"),
  NEARBY_RADIUS_KM:       parseFloat(process.env.EXPO_PUBLIC_NEARBY_RADIUS_KM ?? "5"),
} as const;
