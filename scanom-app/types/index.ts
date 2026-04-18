// TypeScript interfaces used across all screens and services

export interface User {
  id:          string;
  email:       string;
  name:        string;
  location:    string;
  avatar_url?: string | null;
}

export interface AuthState {
  token: string;
  user:  User;
}

export interface WeatherData {
  humidity:    number;
  temperature: number;
  wind_speed?: number;
  source?:     "open-meteo" | "fallback";
}

export interface Explanation {
  overview:   string;
  causes:     string;
  prevention: string[];
  treatment:  string[];
  severity:   "mild" | "moderate" | "severe" | "none";
}

export interface DetectionResult {
  valid:           true;
  disease:         string;
  disease_display: string;
  plant:           "tomato" | "banana";
  confidence:      number;
  is_healthy:      boolean;
  risk_level:      "none" | "low" | "moderate" | "high";
  risk_score:      number;
  spread_radius:   number;
  weather:         WeatherData;
  explanation:     Explanation;
  detection_id:    string | null;
  timestamp:       string;
  lat:             number;
  lng:             number;
}

export interface RejectionResult {
  valid:      false;
  confidence: number;
  message:    string;
}

export type ScanResult = DetectionResult | RejectionResult;

export interface NearbyDetection {
  id:              string;
  lat:             number;
  lng:             number;
  disease:         string;
  disease_display: string;
  plant:           string;
  is_healthy:      boolean;
  risk_level:      "low" | "moderate" | "high";
  spread_radius:   number;
  created_at:      string;
  distance_km?:    number;
}

export interface RiskSummary {
  area_risk_level:          "none" | "low" | "moderate" | "high";
  area_risk_score:          number;
  total_cases_nearby:       number;
  dominant_disease:         string | null;
  dominant_disease_display: string | null;
}

export interface HistoryDetection extends DetectionResult {
  id:         string;
  created_at: string;
}
