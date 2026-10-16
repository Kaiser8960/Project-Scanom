import { Stack } from "expo-router";

/**
 * Auth stack — gives sign-in ↔ sign-up a native slide transition.
 * (The root layout uses <Slot />, which has no navigator and therefore no transitions.)
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "#FFFFFF" },
      }}
    />
  );
}
