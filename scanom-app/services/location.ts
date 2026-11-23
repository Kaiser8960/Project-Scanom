/**
 * GPS location service using expo-location and AsyncStorage preference.
 */

import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Coordinates {
  lat: number;
  lng: number;
}

const LOCATION_SHARING_KEY = "scanom_location_sharing";

export async function isLocationSharingEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(LOCATION_SHARING_KEY);
  return val === null ? true : val === "true";
}

export async function setLocationSharingEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(LOCATION_SHARING_KEY, String(enabled));
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

// Default coordinates (Cebu City) used when GPS is unavailable
export const DEFAULT_LOCATION: Coordinates = {
  lat: 10.3157,
  lng: 123.8854,
};
