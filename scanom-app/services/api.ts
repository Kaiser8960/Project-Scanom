/**
 * API service for all HTTP calls to the FastAPI backend.
 */

import * as SecureStore from "expo-secure-store";
import { CONFIG } from "@/constants/config";
import type { ScanResult, NearbyDetection, RiskSummary, HistoryDetection } from "@/types";

const BASE = CONFIG.API_BASE_URL;

// Token helpers

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("scanom_token");
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

// Authentication endpoints

export async function register(
  name: string,
  location: string,
  email: string,
  password: string
) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, location, email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail ?? "Registration failed");
  }
  return res.json();
}

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail ?? "Login failed");
  }
  return res.json();
}

// Leaf scan endpoint

export async function detect(
  imageBase64: string,
  lat: number,
  lng: number
): Promise<ScanResult> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/detect`, {
    method: "POST",
    headers,
    body: JSON.stringify({ image_base64: imageBase64, lat, lng }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Detection request failed");
  }
  return res.json();
}

// Detection query endpoints

export async function getDetectionsNearby(
  lat: number,
  lng: number,
  radiusKm: number = CONFIG.NEARBY_RADIUS_KM
): Promise<{ detections: NearbyDetection[]; count: number }> {
  const url = `${BASE}/detections/nearby?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch nearby detections");
  return res.json();
}

export async function getUserDetections(
  limit = 20,
  offset = 0
): Promise<{ detections: HistoryDetection[]; total: number }> {
  const headers = await authHeaders();
  const url = `${BASE}/detections/user?limit=${limit}&offset=${offset}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error("Failed to fetch scan history");
  return res.json();
}

// Area risk summary endpoint

export async function getRiskSummary(
  lat: number,
  lng: number
): Promise<RiskSummary> {
  const url = `${BASE}/risk/summary?lat=${lat}&lng=${lng}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch risk summary");
  return res.json();
}

// Resolve detection endpoint

export async function resolveDetection(detectionId: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/detections/${detectionId}/resolve`, {
    method: "PATCH",
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to resolve detection");
  }
}

// Profile update endpoint

export async function updateProfile(
  fields: { name?: string; location?: string }
): Promise<{ user: import("@/types").User }> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/auth/profile`, {
    method:  "PUT",
    headers,
    body:    JSON.stringify(fields),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to update profile");
  }
  return res.json();
}

// Account deletion endpoint

export async function deleteAccount(): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/auth/me`, {
    method:  "DELETE",
    headers,
  });
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to delete account");
  }
}
