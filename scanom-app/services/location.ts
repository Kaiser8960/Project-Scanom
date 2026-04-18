/**
 * Location service — expo-location wrapper.
 * Requests permissions and returns current GPS coordinates.
 */

import * as Location from "expo-location";

export interface Coordinates {
  lat: number;
  lng: number;
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
}

export async function getCurrentLocation(): Promise<Coordinates | null> {
  const granted = await requestLocationPermission();
  if (!granted) return null;

  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
    };
  } catch {
    return null;
  }
}

// Default coordinates (Cebu City) — used as fallback when GPS is unavailable
export const DEFAULT_LOCATION: Coordinates = {
  lat: 10.3157,
  lng: 123.8854,
};
