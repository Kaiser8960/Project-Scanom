/**
 * Scanom Design System — Color Tokens
 *
 * ─── Brand Heritage ───────────────────────────────────────────────────────────
 *  The "old green" (#0F2419 / #1B3A2D) is the original dark forest green used
 *  for the app's header and navigation bar.  This is intentionally different
 *  from the logo's primary green (#025f00), which is a more saturated hue.
 *
 *  Logo colors (from Scanom Logo.svg):
 *    "Scan" wordmark  →  Gray   #504c4c
 *    "om"  wordmark   →  Green  #025f00
 *
 *  App UI colors (confirmed by user):
 *    Header / Nav BG  →  Dark forest green  #0F2419  ← "old green"
 *    Active tint      →  Lime green         #4ADE80
 *    Primary button   →  #1B4A2F  (dark forest green variant)
 *    Screen body      →  Pure white         #FFFFFF
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const Colors = {
  // ── Old-green family (UI chrome) ─────────────────────────────────────────
  green: {
    darkest:  "#0F2419",   // Header, nav bar background
    dark:     "#1B3A2D",   // Card borders, FAB inner bg
    medium:   "#1B4A2F",   // Primary buttons, section titles
    muted:    "#2D4A38",   // Subtle dividers
    lime:     "#4ADE80",   // Active tab tint, glows, accents
    tintBg:   "#E8F5E9",   // Soft green backgrounds (badges, banners)
    tintBorder:"#BBF7D0",  // Soft green borders
  },

  // ── Logo brand colors ─────────────────────────────────────────────────────
  logo: {
    green:    "#025f00",   // Official logo green ("om" wordmark)
    gray:     "#504c4c",   // Official logo gray ("Scan" wordmark)
  },

  // ── Screen backgrounds ────────────────────────────────────────────────────
  bg: {
    screen:   "#FFFFFF",   // All screen bodies — pure white (never cream)
    card:     "#FFFFFF",   // Card backgrounds
    muted:    "#F9FAFB",   // Very light separator / input field
    border:   "#E5E7EB",   // Card/input borders on white
  },

  // ── Text ──────────────────────────────────────────────────────────────────
  text: {
    primary:  "#111827",   // Headings and main content
    secondary:"#374151",   // Body text
    logo:     "#504c4c",   // Logo gray — use for label/meta text
    muted:    "#6B7280",   // Subtitles, timestamps
    placeholder:"#9CA3AF", // Input placeholder text
    inverse:  "#F0FDF4",   // Text on dark green backgrounds
  },

  // ── Semantic / Risk ───────────────────────────────────────────────────────
  risk: {
    none:     "#4ADE80",
    low:      "#4ADE80",
    moderate: "#EAB308",
    high:     "#EF4444",
  },
};

export default Colors;
