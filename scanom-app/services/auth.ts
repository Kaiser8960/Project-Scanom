/**
 * Auth service — login, register, session management.
 * Stores the Supabase JWT in SecureStore (encrypted on-device storage).
 */

import * as SecureStore from "expo-secure-store";
import { login as apiLogin, register as apiRegister } from "./api";
import type { User } from "@/types";

const TOKEN_KEY = "scanom_token";
const USER_KEY  = "scanom_user";

// ── TOKEN STORAGE ────────────────────────────────────────────────────────────

export async function saveSession(token: string, user: User): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function getStoredUser(): Promise<User | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export function isLoggedIn(): Promise<boolean> {
  return getStoredToken().then((t) => !!t);
}

// ── AUTH ACTIONS ─────────────────────────────────────────────────────────────

export async function signIn(
  email: string,
  password: string
): Promise<{ token: string; user: User }> {
  const result = await apiLogin(email, password);
  await saveSession(result.token, result.user);
  return result;
}

export async function signUp(
  name: string,
  location: string,
  email: string,
  password: string
): Promise<{ token: string; user: User }> {
  const result = await apiRegister(name, location, email, password);
  if (result.token) {
    await saveSession(result.token, result.user);
  }
  return result;
}

export async function signOut(): Promise<void> {
  await clearSession();
}
