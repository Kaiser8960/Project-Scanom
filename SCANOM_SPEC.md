# SCANOM_SPEC.md — Main System Specification
> Feed this file to your IDE AI agent for all Expo app and FastAPI backend work.
> For CNN training, use SCANOM_ML.md instead.
> Last updated: April 2026 — Velas Co. / USPF CCS

---

## 1. Project Identity

| Field | Value |
|---|---|
| **Project Name** | Scanom |
| **Full Title** | Scanom: A Mobile-Based Plant Disease Detection and Spatial Risk Forecasting System Using Convolutional Neural Networks and Geospatial Analysis |
| **Team** | Velas Co. — Jim Dejito & Ruchanie Faith Velasco |
| **School** | USPF — College of Computer Studies, BSCS-3 |
| **Deadline** | May 5–10, 2026 |
| **Research Type** | Applied Research |
| **Methodology** | Descriptive-Developmental + Scrum (Agile) |

---

## 2. Final Class List (10 Classes)

```
BANANA (4 classes):     TOMATO (6 classes):
  banana_healthy          tomato_healthy
  banana_sigatoka         tomato_early_blight
  banana_panama_wilt      tomato_late_blight
  banana_cordana          tomato_bacterial_spot
                          tomato_leaf_mold
                          tomato_powdery_mildew
```

Plant type is automatically extracted from the class name prefix:
- `banana_*` → plant = "banana"
- `tomato_*` → plant = "tomato"

---

## 3. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Mobile | Expo (React Native) | Cross-platform mobile app |
| Testing | Expo Go (QR code) | Fast on-device testing |
| Production | EAS Build → APK | Final thesis demo build |
| Backend | FastAPI (Python) | API server, main logic hub |
| CNN Model | EfficientNetV2B0 → TFLite | Plant disease classification |
| Fuzzy Logic | scikit-fuzzy (Python) | Risk level + spread radius |
| Map Display | react-native-maps + Google Maps API | Visual map + risk circles |
| Weather Data | Open-Meteo API (free, no key) | Humidity + temperature inputs |
| Database | Supabase (PostgreSQL + PostGIS) | Detection records + geo queries |
| AI Explanation | TBD API | Disease overview + recommendations |
| Hosting | Railway or Render | FastAPI backend deployment |

---

## 4. Design System

### Color Palette
```
Primary:        #1B3A2D   (dark forest green — buttons, active nav, badges)
Primary Light:  #2D6A4F   (hover states, secondary buttons)
Accent:         #95D5B2   (light mint green — backgrounds, chips)
Background:     #F5F7F5   (off-white app background)
Surface:        #FFFFFF   (cards, modals)
Text Primary:   #1A1A1A   (headings)
Text Secondary: #6B7280   (subtitles, captions)
Border:         #E5E7EB   (input borders, dividers)

Risk Colors:
  High Risk:     #EF4444  (red)
  Moderate Risk: #F59E0B  (amber)
  Low Risk:      #22C55E  (green)
  Safe Zone:     #1B3A2D  (dark green)
```

### Typography
```
Font: System default (San Francisco on iOS, Roboto on Android)
Heading Large:  28px, bold,   #1A1A1A
Heading Medium: 22px, bold,   #1A1A1A
Heading Small:  18px, semibold, #1A1A1A
Body:           15px, regular, #1A1A1A
Caption:        13px, regular, #6B7280
Label:          12px, medium,  #6B7280  (uppercase tracking)
```

### Component Standards
```
Border Radius:
  Cards:    16px
  Buttons:  50px (fully rounded / pill shape)
  Inputs:   12px
  Badges:   50px (pill)

Shadows:
  Card shadow: 0 2px 8px rgba(0,0,0,0.08)

Spacing unit: 4px base (use multiples: 8, 12, 16, 20, 24, 32)
```

---

## 5. UI Dependencies

### Install Commands
```bash
# Core navigation
npx expo install expo-router

# Camera and location
npx expo install expo-camera
npx expo install expo-location
npx expo install expo-image-manipulator

# Maps
npx expo install react-native-maps

# UI styling
npm install nativewind
npm install --save-dev tailwindcss

# Safe area and screens
npx expo install react-native-safe-area-context
npx expo install react-native-screens

# Icons
npm install lucide-react-native
npx expo install @expo/vector-icons

# Animations
npx expo install react-native-reanimated

# Auth
npx expo install expo-secure-store

# HTTP client
npm install axios

# List performance
npm install @shopify/flash-list
```

### tailwind.config.js
```javascript
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1B3A2D",
        "primary-light": "#2D6A4F",
        accent: "#95D5B2",
        background: "#F5F7F5",
        "risk-high": "#EF4444",
        "risk-moderate": "#F59E0B",
        "risk-low": "#22C55E",
      },
    },
  },
  plugins: [],
};
```

---

## 6. App Folder Structure

```
scanom-app/
  app/
    _layout.tsx              # Root layout, auth gate
    (auth)/
      sign-in.tsx            # Sign In screen
      sign-up.tsx            # Sign Up screen
    (tabs)/
      _layout.tsx            # Bottom tab navigator
      index.tsx              # Dashboard / Home screen
      map.tsx                # Geospatial Risk Map screen
      scan.tsx               # Scanner screen
      history.tsx            # Scan History screen
      profile.tsx            # Profile screen
    result.tsx               # Diagnosis Result screen (modal/push)
    rejection.tsx            # Invalid scan screen
  components/
    ui/
      Button.tsx             # Reusable pill button
      Badge.tsx              # Risk/severity badge
      Card.tsx               # Surface card wrapper
      Header.tsx             # Top app bar
      BottomNav.tsx          # Bottom navigation bar
    diagnosis/
      DiseaseCard.tsx        # Disease name + confidence
      SeverityBadge.tsx      # Severity level pill
      SymptomsList.tsx       # Observed symptoms list
      TreatmentCard.tsx      # Treatment recommendation card
      SpreadForecast.tsx     # Mini risk map + radius text
    map/
      RiskCircle.tsx         # Colored circle overlay on map
      DetectionPin.tsx       # Map pin for past detections
      MapLegend.tsx          # Legend card (Low/Moderate/High/Safe)
    history/
      ScanCard.tsx           # Individual scan record card
      MonthlySummary.tsx     # Monthly activity summary card
  services/
    api.ts                   # All FastAPI endpoint calls
    auth.ts                  # Login, signup, session management
    location.ts              # expo-location wrapper
  constants/
    config.ts                # API base URL, Maps key
    classes.ts               # Class names and display labels
  types/
    index.ts                 # TypeScript interfaces
```

---

## 7. Screen Specifications

### Standard Bottom Navigation (ALL screens)
```
Order: Home | Map | SCAN (center, elevated, #1B3A2D circle) | History | Profile
Icons: house | map | barcode-scanner | clock-rotate-left | person
Active color: #1B3A2D
Inactive color: #6B7280
SCAN button: elevated circular button, always #1B3A2D, white icon
```

---

### Screen 1 — Sign In (auth/sign-in.tsx)

**Layout (top to bottom):**
```
Background: #F5F7F5

1. Logo + App Name
   - Leaf icon (dark green square, rounded, white icon)
   - "Scanom" text next to it
   - Center aligned

2. Heading
   - "Welcome Back" — Heading Large, #1B3A2D
   - "Securely access your plant health data." — Body, #6B7280
   - Center aligned

3. Form (surface card, 16px radius, white)
   - Label: "Email Address or Username" — Label, bold
   - Input: email/username, placeholder "e.g. juan.dela.cruz"
   - Label: "Password" + "Forgot password?" (right aligned, #1B3A2D)
   - Input: password, show/hide toggle eye icon

4. Sign In Button
   - Full width pill, #1B3A2D background, white text
   - Text: "Sign In →"

5. Bottom link
   - "Don't have an account? Request Access" — center
   - "Request Access" tappable, #1B3A2D color
```

**Logic:**
```typescript
// On Sign In press:
// 1. Validate email and password not empty
// 2. Call POST /auth/login
// 3. On success → save token to expo-secure-store → navigate to (tabs)/index
// 4. On failure → show inline error below input
```

---

### Screen 2 — Sign Up (auth/sign-up.tsx)

**Layout (top to bottom):**
```
Background: #F5F7F5

1. Logo + "Scanom" text — center
2. Plant pot icon (dark green square, rounded)
3. "Get Started" — Heading Large, #1B3A2D
4. "Help us personalize your experience." — Body, #6B7280

5. Form (surface card)
   - Label: "PREFERRED NAME" (uppercase label style)
   - Input: with person icon left, placeholder "e.g. Juan Dela Cruz"

   - Label: "CURRENT LOCATION" (uppercase label style)
   - Input: with location-pin icon left, placeholder "Search for your city..."
   - Below input: "↗ Use my current position" — tappable, #1B3A2D
     → calls expo-location to get coordinates and reverse geocode city name

   - Label: "PASSWORD" (uppercase label style)
   - Input: with lock icon left, dots placeholder

6. Continue Button
   - Full width pill, #1B3A2D, white text: "Continue →"

7. Bottom text
   - "By continuing, you agree to our Privacy Policy
      and how we handle Scanom data."
   - "Privacy Policy" underlined and tappable
```

**Logic:**
```typescript
// On Continue press:
// 1. Validate all fields filled
// 2. Call POST /auth/register
// 3. On success → save token → navigate to (tabs)/index
// 4. On failure → show inline error

// On "Use my current position":
// 1. Request location permission
// 2. Get current coordinates
// 3. Reverse geocode to get city name
// 4. Populate location input field
```

---

### Screen 3 — Dashboard / Home (tabs/index.tsx)

**Layout (top to bottom):**
```
Background: #F5F7F5

1. Top Header
   - Left: User avatar (circle, 36px) + "Scanom" text
   - Right: Bell icon (notification)

2. Location + Greeting
   - City name from user profile — Heading Large, #1B3A2D
   - Dynamic subtitle based on area risk:
     • High risk:     "Disease outbreak risk detected nearby."
     • Moderate risk: "Moderate disease activity in your area."
     • Low risk:      "Low disease activity. Stay vigilant."
     • No data:       "No recent detections in your area."

3. Area Risk Card (full width, dark green #1B3A2D, white text, 16px radius)
   - Top left: location pin + city/barangay name (small label)
   - Center: Risk level large text — "LOW RISK" / "MODERATE RISK" / "HIGH RISK"
   - Sub: "X disease detections within 5km"
   - Sub: Current temp + humidity (from Open-Meteo, small text)
   - Bottom: "RECENT ACTIVITY" label
   - Horizontally scrollable mini cards showing last 2 detections in area:
     • Disease name + plant type + time ago

4. Quick Scan Button
   - Full width pill, #1B3A2D, white
   - Icon: barcode scanner
   - Text: "Scan a Plant Leaf"
   - On press → navigate to (tabs)/scan

5. Your Recent Scans (section header + "See All" link)
   - Horizontal scroll of last 3 ScanCard components
   - Each shows: thumbnail + disease name + severity badge + date

6. Weather Strip (small, secondary info)
   - Two small cards side by side:
     • Humidity: XX% (from Open-Meteo)
     • Temperature: XX°C (from Open-Meteo)
   - Caption: "Current conditions affecting disease spread"
```

**Logic:**
```typescript
// On mount:
// 1. Get user location (expo-location)
// 2. Call GET /risk/summary?lat=&lng= → area risk level + count
// 3. Call GET /detections/nearby?lat=&lng=&radius_km=5 → recent detections
// 4. Call Open-Meteo API → humidity + temperature display
// 5. Call GET /detections/user → user's own recent scans

// Risk card color:
const riskCardColor = {
  high:     "#EF4444",
  moderate: "#F59E0B",
  low:      "#22C55E",
  none:     "#1B3A2D",
}
```

---

### Screen 4 — Scanner (tabs/scan.tsx)

**Layout (top to bottom):**
```
Background: #000000 (camera fullscreen) with UI overlay

1. Top Header (overlay on camera)
   - Left: User avatar + "Scanom"
   - Right: Bell icon

2. Title (above camera)
   - "Scanning" — Heading Large, white or dark depending on bg
   - "Align the leaf with the marker to begin." — Body, #6B7280

3. Camera Viewfinder (main area)
   - Full width, 4:3 ratio
   - Corner bracket alignment markers (thin #95D5B2 lines at corners)
   - Center crosshair
   - Bottom overlay pill inside camera:
     • Left: animated spinner icon (green circle)
     • Text: "ANALYSIS STATUS" (label uppercase)
     • Sub: Dynamic status text:
       - Idle:      "Align leaf with marker..."
       - Capturing: "Capturing image..."
       - Sending:   "Analyzing disease..."
       - Done:      "Analysis complete!"

4. Scan Trigger Button
   - Large circular button, #1B3A2D, center below camera
   - Barcode scanner icon, white
   - On press → capture photo → send to backend

5. Secondary Actions (row)
   - Left pill: "📁 Upload" — upload from gallery
   - Right pill: "🕐 Recent" — navigate to history

6. Pro Tip Card (bottom)
   - Small icon: lightbulb/star, #95D5B2 background circle
   - "Pro Tip" — semibold
   - "Ensure the leaf fills at least 50% of the marker area
      and is well-lit for the most accurate identification."
```

**Logic:**
```typescript
// On Scan button press:
// 1. Capture photo from expo-camera
// 2. Resize to 800x800 max via expo-image-manipulator (keep quality)
// 3. Get GPS coordinates via expo-location
// 4. Convert image to base64
// 5. Update status text → "Analyzing disease..."
// 6. POST /detect { image, lat, lng }
// 7. On success:
//    a. confidence >= 0.70 AND disease detected → navigate to result.tsx
//    b. confidence >= 0.70 AND class is healthy → navigate to result.tsx (healthy state)
//    c. confidence < 0.70 → navigate to rejection.tsx
// 8. On network error → show toast "Connection failed. Check your internet."

// On Upload press:
// 1. Open image picker (expo-image-picker)
// 2. Same flow as camera capture from step 3
```

---

### Screen 5 — Diagnosis Result (result.tsx)

**This screen has THREE states based on the detection result.**

#### State 1 — DISEASED (confidence ≥ 0.70, class ≠ healthy)

**Layout (scrollable, top to bottom):**
```
Background: #F5F7F5

1. Top Header
   - "Scanom" + notifications label
   - Bell icon right

2. Page Title
   - "Diagnosis Result" — Heading Large, #1B3A2D
   - "Analysis complete based on your recent scan." — Body, #6B7280

3. Scanned Image Thumbnail
   - The actual photo taken by user
   - Full width, rounded 16px, ~200px tall

4. Primary Identification Card (white surface card)
   - Label: "PRIMARY IDENTIFICATION" — uppercase label, #6B7280
   - Disease name — Heading Medium, #1B3A2D
     (formatted: "tomato_early_blight" → "Early Blight")
   - Plant type — Body, #6B7280
     ("Detected on: Tomato")
   - AI overview text — Body, #1A1A1A (from ai_explanation.overview)
   - Two badges row:
     • Severity badge: pill colored by severity
       - severe:   red   background, white text,  "⚠ Severity: High"
       - moderate: amber background, white text,  "⚠ Severity: Moderate"
       - mild:     green background, white text,  "✓ Severity: Mild"
     • Confidence badge: #E5E7EB background, #1A1A1A text
       "✓ XX% Accuracy"

5. Observed Symptoms / Causes Card (white surface card)
   - Label: "👁 Observed Symptoms & Causes" — semibold
   - Body text: ai_explanation.causes
   - Bullet list: common symptoms for this disease (from AI prevention tips context)

6. Spread Forecast Card (white surface card)
   - Label: "Forecast" — semibold
   - Sub-label: "Spread Forecast" — bold
   - Text: "If untreated, this disease may spread up to
            {spread_radius}m within the area."
   - Mini map view (react-native-maps, non-interactive, small height 150px)
     • Centered on user's GPS coordinates
     • Single risk circle overlay:
       - High:     red,    opacity 0.3
       - Moderate: amber,  opacity 0.3
       - Low:      green,  opacity 0.3
     • Label: "PROJECTED RISK ZONE"
   - Risk level pill below map:
     "Area Risk: HIGH / MODERATE / LOW"

7. Recommended Treatments (white surface card)
   - Label: "Recommended Treatments" — Heading Small
   - For each item in ai_explanation.treatment + ai_explanation.prevention:
     TreatmentCard component:
       • Icon (based on treatment type — scissors, flask, layout)
       • Treatment title — semibold
       • Treatment description — body
       • Dark green pill button: "STEP-BY-STEP GUIDE" or "LEARN MORE"
         → for thesis scope: this button shows an expanded text modal

8. Bottom padding (safe area)
```

#### State 2 — HEALTHY (confidence ≥ 0.70, class = *_healthy)
```
Same header and image thumbnail

Simplified card:
  Large checkmark icon, #22C55E
  "Your Plant Looks Healthy!" — Heading Medium, #1B3A2D
  "Plant type: Tomato / Banana"
  "No disease detected with XX% confidence."
  
  Small info card:
  "Continue monitoring your plant regularly
   and ensure optimal growing conditions."

  AI overview text (still fetch — prompt returns
  general health maintenance tips for healthy plants)
```

#### State 3 — REJECTED (confidence < 0.70) → rejection.tsx
```
Background: #F5F7F5, centered content

  Warning icon (amber, large)
  "Unable to Identify Leaf" — Heading Medium, #1B3A2D
  
  Body text:
  "We couldn't confidently identify this as a
   tomato or banana leaf. Please ensure:"

  Checklist (with X or bullet icons):
  • The leaf fills at least 50% of the frame
  • Lighting is clear and even — avoid shadows
  • The leaf is in focus and not blurry
  • You are scanning a tomato or banana plant

  Two buttons:
  • "Try Again" — primary pill, #1B3A2D
    → navigate back to scan.tsx
  • "Upload from Gallery" — secondary outline pill
    → open image picker
```

---

### Screen 6 — Geospatial Risk Map (tabs/map.tsx)

**Layout:**
```
Background: Map fills full screen

1. Top Header (floating over map)
   - Left: User avatar + "Scanom"
   - Right: Bell icon
   - Both on white/frosted pill background

2. Search Bar (floating, below header)
   - Full width pill, white background, shadow
   - Left: search icon, #6B7280
   - Placeholder: "Search areas or species..."
   - Right: filter icon (sliders)

3. "Risk Map" title + subtitle (floating card, top-left)
   - "Risk Map" — Heading Medium, #1B3A2D
   - "Current environmental risks in your area." — Caption

4. Map Area (react-native-maps, Google Maps)
   - Fills entire screen behind overlays
   - User location blue dot
   - For each nearby detection (from GET /detections/nearby):
     Circle overlay:
       • Center: detection lat/lng
       • Radius: detection.spread_radius (meters)
       • Color based on risk_level:
         - high:     fillColor rgba(239,68,68,0.25),  strokeColor #EF4444
         - moderate: fillColor rgba(245,158,11,0.25), strokeColor #F59E0B
         - low:      fillColor rgba(34,197,94,0.25),  strokeColor #22C55E
       • On press → show bottom sheet with detection details

   Map Controls (right side floating):
   • Locate me button (⊙) — white circle button
   • Zoom in (+) — white circle button
   • Zoom out (−) — white circle button

5. Map Legend Card (bottom floating card, white, 16px radius, shadow)
   - "MAP LEGEND" — Label uppercase, bold
   - Info icon (right)
   - Four rows:
     • 🔴 High Risk      — "Active outbreak zone"
     • 🟡 Moderate Risk  — "Elevated spread potential"
     • 🟢 Low Risk       — "Minimal spread activity"
     • ⚫ Safe Zone      — "No detections nearby"
   - Each row: colored dot + label + description

   Bottom of legend card: area summary
   - "X active detections within 5km"
```

**Logic:**
```typescript
// On mount:
// 1. Get user location
// 2. Center map on user location
// 3. Call GET /detections/nearby?lat=&lng=&radius_km=5
// 4. Render circle for each detection
// 5. Call GET /risk/summary → show area count in legend

// On detection circle press:
// Show bottom sheet (modal):
//   - Disease name (formatted)
//   - Plant type
//   - Risk level badge
//   - Distance from user: "X km away"
//   - Date: "Detected on April 4, 2026"
```

---

### Screen 7 — Scan History (tabs/history.tsx)

**Layout (scrollable, top to bottom):**
```
Background: #F5F7F5

1. Top Header
   - User avatar + "Scanom" + Bell icon

2. Page Title
   - "Scan History" — Heading Large, #1B3A2D
   - "Review your past plant health records." — Body, #6B7280

3. Monthly Activity Card (full width, #1B3A2D, white text, 16px radius)
   - Label: "MONTHLY ACTIVITY" — uppercase small
   - Large number: "XX Scans" — bold large
   - Sub: Most common detection this month:
     "Most detected: Tomato Early Blight"
   - Sub: "X diseases detected this month."

4. Average Status Card (white surface)
   - Sparkle/star icon, #95D5B2 background circle
   - Status label — bold (e.g., "Diseased" or "Healthy")
   - "AVERAGE STATUS" — uppercase label, #6B7280

5. Past Scans List (FlashList for performance)
   - For each detection in user history:
     ScanCard component:
       • Left: thumbnail image (the scanned photo, 60x60, rounded 8px)
       • Middle:
         - Disease name formatted — semibold
           ("tomato_early_blight" → "Tomato — Early Blight")
         - Short AI overview excerpt — 1 line, caption
         - Row: 📅 date string + 📍 location string
       • Right: Status badge pill
         - healthy:  "HEALTHY"  — green
         - mild:     "MILD"     — green
         - moderate: "MODERATE" — amber
         - severe:   "SEVERE"   — red
       • Full width dark green "View Details" button
         → navigates to result.tsx with pre-loaded data (no re-detection)
```

**Logic:**
```typescript
// On mount:
// 1. Call GET /detections/user?limit=20
// 2. Render list sorted by created_at descending
// 3. Monthly summary: filter by current month, count, find most frequent disease

// On "View Details":
// Pass full detection object to result.tsx
// result.tsx checks if data is passed → skip API call, render directly
```

---

### Screen 8 — Profile (tabs/profile.tsx)

**Layout (top to bottom):**
```
Background: #F5F7F5

1. Top Header
   - User avatar + "Scanom" + Bell icon

2. Avatar Section (center aligned)
   - Large circle avatar (80px), green ring border (#1B3A2D)
   - Small edit button (pencil icon, #1B3A2D circle) — bottom right of avatar
   - On press: open image picker to update avatar

3. User Info (center)
   - Display name — Heading Medium, bold, #1A1A1A
   - Location pin icon + city name — Caption, #6B7280

4. App Settings Section
   - "App Settings" — Heading Small, #1A1A1A
   - Settings list card (white surface, 16px radius):
     Each row: icon (left) + label + chevron right (>)
     • 🔔 Notifications  →  placeholder screen or toggle
     • 🔒 Privacy & Security  →  placeholder screen
     • ❓ Support Center  →  placeholder screen or mailto link

5. Logout Button
   - Full width outlined pill
   - Red text: "→ Logout"
   - Icon: log-out icon, red
   - On press: clear secure store token → navigate to (auth)/sign-in
```

---

## 8. FastAPI Backend Structure

```
scanom-backend/
  main.py                    # FastAPI app, CORS, router registration
  requirements.txt
  .env
  model/
    efficientnetv2b0.tflite  # trained + exported model (EfficientNetV2B0, SELECT_TF_OPS)
    class_names.json          # class index → class name mapping
  routers/
    auth.py                   # POST /auth/login, POST /auth/register
    detect.py                 # POST /detect
    detections.py             # GET /detections/nearby, GET /detections/user
    risk.py                   # GET /risk/summary
  services/
    inference.py              # TFLite model load + prediction
    fuzzy_engine.py           # scikit-fuzzy risk computation
    weather.py                # Open-Meteo API fetch
    ai_explainer.py           # AI API call for disease explanation
    geo.py                    # distance helpers
  database/
    supabase_client.py        # Supabase connection init
    queries.py                # all SQL/PostGIS queries
  utils/
    image_processing.py       # decode base64, preprocess to tensor
    class_utils.py            # extract plant + disease from class name
```

### requirements.txt
```
fastapi
uvicorn
tensorflow
scikit-fuzzy
supabase
httpx
pillow
numpy
python-multipart
python-dotenv
scipy
networkx
```

---

## 9. API Endpoints — Full Specification

### POST /auth/register
```
Input:  { name: str, location: str, password: str, lat: float, lng: float }
Output: { token: str, user: { id, name, location } }
```

### POST /auth/login
```
Input:  { email: str, password: str }
Output: { token: str, user: { id, name, location } }
```

### POST /detect
```
Input:
  image: str (base64 encoded)
  lat: float
  lng: float

Process:
  1. Decode base64 → PIL Image → resize/normalize to 224x224 tensor
  2. Run TFLite inference → class_name + confidence
  3. Check confidence threshold:
     - confidence < 0.70 → return { valid: false }
  4. Extract plant + disease from class_name
  5. Fetch Open-Meteo: humidity + temperature for lat/lng
  6. Query Supabase PostGIS: detections within 5km → density + days_since_first
  7. Run fuzzy logic → risk_score + risk_level + spread_radius (disease-adjusted)
  8. Call AI API → structured explanation JSON
  9. Save full record to Supabase detections table
  10. Return full result

Output (valid scan):
{
  "valid": true,
  "disease": "tomato_early_blight",
  "disease_display": "Early Blight",
  "plant": "tomato",
  "confidence": 0.91,
  "is_healthy": false,
  "risk_level": "moderate",
  "risk_score": 54.3,
  "spread_radius": 320,
  "weather": { "humidity": 78.4, "temperature": 29.1 },
  "explanation": {
    "overview": "...",
    "causes": "...",
    "prevention": ["...", "...", "..."],
    "treatment": ["...", "..."],
    "severity": "moderate"
  },
  "detection_id": "uuid",
  "timestamp": "2026-04-04T10:00:00Z",
  "lat": 10.31,
  "lng": 123.89
}

Output (invalid / low confidence):
{
  "valid": false,
  "confidence": 0.12,
  "message": "Could not identify a tomato or banana leaf with sufficient confidence."
}
```

### GET /detections/nearby
```
Params: lat, lng, radius_km (default 5)
Output:
{
  "detections": [
    {
      "id": "uuid",
      "lat": 10.31, "lng": 123.89,
      "disease": "tomato_early_blight",
      "disease_display": "Early Blight",
      "plant": "tomato",
      "risk_level": "moderate",
      "spread_radius": 320,
      "created_at": "2026-04-03T08:00:00Z",
      "distance_km": 1.2
    }
  ],
  "count": 5
}
```

### GET /detections/user
```
Headers: Authorization: Bearer <token>
Params:  limit (default 20), offset (default 0)
Output:  { detections: [...full detection objects], total: int }
```

### GET /risk/summary
```
Params: lat, lng
Output:
{
  "area_risk_level": "moderate",
  "area_risk_score": 54.3,
  "total_cases_nearby": 5,
  "dominant_disease": "tomato_early_blight",
  "dominant_disease_display": "Early Blight"
}
```

---

## 10. Confidence Threshold & Plant Detection Logic

```python
CONFIDENCE_THRESHOLD = 0.70

def process_prediction(predictions: list, class_names: list) -> dict:
    max_idx        = predictions.index(max(predictions))
    confidence     = predictions[max_idx]
    class_name     = class_names[max_idx]

    if confidence < CONFIDENCE_THRESHOLD:
        return { "valid": False, "confidence": float(confidence) }

    plant, disease = class_name.split("_", 1)
    is_healthy     = disease == "healthy"

    return {
        "valid":      True,
        "class_name": class_name,
        "plant":      plant,
        "disease":    disease,
        "is_healthy": is_healthy,
        "confidence": float(confidence),
    }
```

---

## 11. Disease Spread Multiplier

```python
# Applied to base fuzzy radius to make spread disease-aware
DISEASE_SPREAD_MULTIPLIER = {
    # Tomato
    "tomato_late_blight":      1.5,   # fast — airborne spores, wind
    "tomato_early_blight":     1.0,   # moderate — soil splash
    "tomato_bacterial_spot":   0.7,   # slow — contact/insects
    "tomato_leaf_mold":        0.8,   # moderate — high humidity
    "tomato_powdery_mildew":   1.2,   # moderate-fast — airborne
    "tomato_healthy":          0.0,   # no spread
    # Banana
    "banana_sigatoka":         1.4,   # fast — wind-dispersed spores
    "banana_panama_wilt":      0.5,   # very slow — soil/root contact
    "banana_cordana":          1.0,   # moderate
    "banana_healthy":          0.0,   # no spread
}

def compute_spread_radius(risk_score: float, disease_class: str) -> int:
    if risk_score < 35:
        base = int(50 + (risk_score * 2))
    elif risk_score < 70:
        base = int(200 + (risk_score * 3))
    else:
        base = int(500 + (risk_score * 5))

    multiplier = DISEASE_SPREAD_MULTIPLIER.get(disease_class, 1.0)
    return max(0, int(base * multiplier))
```

---

## 12. Fuzzy Logic Engine — Full Code

```python
import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl

def build_fuzzy_system():
    # ── INPUT UNIVERSES ──────────────────────────────────────
    density     = ctrl.Antecedent(np.arange(0, 11, 1),   'density')
    humidity    = ctrl.Antecedent(np.arange(0, 101, 1),  'humidity')
    temperature = ctrl.Antecedent(np.arange(0, 41, 1),   'temperature')
    days        = ctrl.Antecedent(np.arange(0, 31, 1),   'days')
    risk        = ctrl.Consequent(np.arange(0, 101, 1),  'risk')

    # ── MEMBERSHIP FUNCTIONS ─────────────────────────────────
    density['sparse']      = fuzz.trimf(density.universe,     [0, 0, 3])
    density['moderate']    = fuzz.trimf(density.universe,     [2, 5, 7])
    density['dense']       = fuzz.trimf(density.universe,     [5, 10, 10])

    humidity['low']        = fuzz.trimf(humidity.universe,    [0, 0, 40])
    humidity['medium']     = fuzz.trimf(humidity.universe,    [30, 55, 75])
    humidity['high']       = fuzz.trimf(humidity.universe,    [65, 100, 100])

    temperature['cool']    = fuzz.trimf(temperature.universe, [0, 0, 22])
    temperature['optimal'] = fuzz.trimf(temperature.universe, [18, 27, 33])
    temperature['hot']     = fuzz.trimf(temperature.universe, [30, 40, 40])

    days['early']          = fuzz.trimf(days.universe,        [0, 0, 8])
    days['progressing']    = fuzz.trimf(days.universe,        [5, 13, 18])
    days['established']    = fuzz.trimf(days.universe,        [14, 30, 30])

    risk['low']            = fuzz.trimf(risk.universe,        [0, 0, 40])
    risk['moderate']       = fuzz.trimf(risk.universe,        [25, 50, 75])
    risk['high']           = fuzz.trimf(risk.universe,        [60, 100, 100])

    # ── RULES (15) ───────────────────────────────────────────
    rules = [
        # HIGH
        ctrl.Rule(density['dense'] & humidity['high'] & temperature['optimal'], risk['high']),
        ctrl.Rule(density['dense'] & days['established'],                        risk['high']),
        ctrl.Rule(density['dense'] & humidity['high'],                           risk['high']),
        ctrl.Rule(density['moderate'] & humidity['high'] & days['established'],  risk['high']),
        ctrl.Rule(density['dense'] & temperature['optimal'] & days['progressing'], risk['high']),
        # MODERATE
        ctrl.Rule(density['moderate'] & humidity['medium'],                      risk['moderate']),
        ctrl.Rule(density['moderate'] & days['progressing'],                     risk['moderate']),
        ctrl.Rule(density['sparse'] & humidity['high'] & days['established'],    risk['moderate']),
        ctrl.Rule(density['moderate'] & temperature['optimal'],                  risk['moderate']),
        ctrl.Rule(density['dense'] & humidity['low'],                            risk['moderate']),
        # LOW
        ctrl.Rule(density['sparse'] & days['early'],                             risk['low']),
        ctrl.Rule(density['sparse'] & humidity['low'],                           risk['low']),
        ctrl.Rule(density['sparse'] & temperature['cool'],                       risk['low']),
        ctrl.Rule(density['sparse'] & humidity['medium'] & days['early'],        risk['low']),
        ctrl.Rule(density['moderate'] & humidity['low'] & days['early'],         risk['low']),
    ]

    system     = ctrl.ControlSystem(rules)
    simulation = ctrl.ControlSystemSimulation(system)
    return simulation

# Global instance (load once at startup)
FUZZY_SIM = build_fuzzy_system()

def compute_risk(density_val, humidity_val, temp_val, days_val, disease_class):
    FUZZY_SIM.input['density']     = min(density_val, 10)
    FUZZY_SIM.input['humidity']    = min(humidity_val, 100)
    FUZZY_SIM.input['temperature'] = min(temp_val, 40)
    FUZZY_SIM.input['days']        = min(days_val, 30)
    FUZZY_SIM.compute()

    risk_score = float(FUZZY_SIM.output['risk'])

    if risk_score < 35:
        risk_level = "low"
    elif risk_score < 70:
        risk_level = "moderate"
    else:
        risk_level = "high"

    radius = compute_spread_radius(risk_score, disease_class)

    return {
        "risk_score":    round(risk_score, 2),
        "risk_level":    risk_level,
        "spread_radius": radius,
    }

# Fallback values if Open-Meteo is unreachable
FALLBACK_HUMIDITY    = 70.0   # Cebu average
FALLBACK_TEMPERATURE = 29.0   # Cebu average
```

---

## 13. Supabase Database Schema

```sql
-- Run this in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  name         TEXT NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  password     TEXT NOT NULL,  -- store hashed
  location     TEXT,
  avatar_url   TEXT
);

CREATE TABLE detections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  lat             FLOAT NOT NULL,
  lng             FLOAT NOT NULL,
  location        GEOGRAPHY(Point, 4326),
  plant           TEXT NOT NULL,
  disease         TEXT NOT NULL,
  disease_display TEXT NOT NULL,
  is_healthy      BOOLEAN DEFAULT FALSE,
  confidence      FLOAT NOT NULL,
  risk_level      TEXT NOT NULL,
  risk_score      FLOAT NOT NULL,
  spread_radius   INT NOT NULL,
  humidity        FLOAT,
  temperature     FLOAT,
  image_url       TEXT,
  ai_overview     TEXT,
  ai_causes       TEXT,
  ai_prevention   TEXT[],
  ai_treatment    TEXT[],
  ai_severity     TEXT
);

CREATE INDEX detections_location_idx ON detections USING GIST (location);
CREATE INDEX detections_user_idx ON detections (user_id);
CREATE INDEX detections_created_idx ON detections (created_at DESC);

-- Auto-set location geography from lat/lng
CREATE OR REPLACE FUNCTION set_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_location_trigger
BEFORE INSERT ON detections
FOR EACH ROW EXECUTE FUNCTION set_location();
```

---

## 14. Environment Variables

### Backend (.env)
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_role_key
AI_API_KEY=your_ai_api_key
AI_API_URL=your_ai_api_endpoint
OPEN_METEO_BASE=https://api.open-meteo.com/v1/forecast
JWT_SECRET=your_jwt_secret_key
CONFIDENCE_THRESHOLD=0.70
```

### Expo App (constants/config.ts)
```typescript
export const CONFIG = {
  API_BASE_URL:       "https://your-backend.railway.app",
  GOOGLE_MAPS_API_KEY: "your_google_maps_key",
  CONFIDENCE_THRESHOLD: 0.70,
};
```

---

## 15. GNSS Note (for Chapter 3)

Include this sentence in Chapter 3 Methodology under Data Collection:

> *"While the system refers to location acquisition as GPS for simplicity,
> the mobile device utilizes GNSS — encompassing GPS, GLONASS, Galileo,
> and BeiDou constellations — to acquire geographic coordinates through
> the expo-location module, improving positional accuracy under field conditions."*

---

## 16. Sprint Plan

### Sprint 0 — Setup (April 4–7)
```
□ Run merge_datasets.py (see SCANOM_ML.md)
□ Run split_dataset.py
□ Check class image counts — flag under 300
□ Set up Supabase project + run SQL schema above
□ Set up Google Maps API key + billing alert
□ Initialize FastAPI project structure
□ Initialize Expo project with expo-router
□ Set up GitHub repo
□ Schedule DA-RFU VII visit
```

### Sprint 1 — CNN Model (April 8–14)
```
□ See SCANOM_ML.md for full training instructions
□ Target: 95% accuracy, 0.90 F1
□ Export TFLite → place in scanom-backend/model/
□ Save class_names.json → place in scanom-backend/model/
```

### Sprint 2 — Backend (April 15–19)
```
□ Implement all routers and services
□ Implement fuzzy_engine.py (code above)
□ Implement inference.py with confidence threshold
□ Implement weather.py (Open-Meteo)
□ Implement ai_explainer.py
□ Test all endpoints in Postman
□ Deploy to Railway or Render
□ Confirm /detect returns correct JSON structure
```

### Sprint 3 — Mobile App (April 20–25)
```
□ Build all 8 screens per spec above
□ Implement bottom nav (standard order: Home|Map|SCAN|History|Profile)
□ Implement three result states (diseased / healthy / rejected)
□ Connect all screens to FastAPI via services/api.ts
□ Test full flow on physical device via Expo Go QR
□ Verify camera + GPS permissions work on device
```

### Sprint 4 — DA-RFU VII + Refinement (April 26–28)
```
□ Visit DA-RFU VII — collect tomato + banana disease photos
□ Shoot with DSLR (Canon EOS 750D, JPG Fine) + smartphone
□ Sort into class folders + re-run merge/split scripts
□ Fine-tune model if accuracy drops below 95%
□ Update TFLite in backend
```

### Sprint 5 — Testing + Polish (April 29–May 2)
```
□ End-to-end test with real diseased leaves
□ Test rejection flow with non-plant objects
□ Test with no internet (graceful error messages)
□ Test Open-Meteo fallback (FALLBACK_HUMIDITY/TEMP)
□ UI polish — spacing, colors, badges
□ Generate APK via EAS Build
```

### Sprint 6 — Docs + Defense (May 3–10)
```
□ Write Chapter 3 (include GNSS sentence, fuzzy logic design,
  dataset collection, architecture, confidence threshold logic)
□ Write Chapter 4 (metrics table, screenshots, risk map results)
□ Prepare defense slides
□ Rehearse demo with real leaves
□ Submit thesis document
```

---

*SCANOM_SPEC.md — Velas Co. / USPF CCS / April 2026*
*Companion file: SCANOM_ML.md for CNN training specification*
