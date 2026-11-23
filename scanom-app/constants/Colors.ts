/**
 * Color palette tokens for Scanom UI, brand logo, and risk levels.
 */

export const Colors = {
  // Primary green UI colors
  green: {
    darkest:  "#0F2419",   // Header and nav bar background
    dark:     "#1B3A2D",   // Card borders and FAB background
    medium:   "#1B4A2F",   // Primary buttons and section titles
    muted:    "#2D4A38",   // Subtle dividers
    lime:     "#4ADE80",   // Active tab tint and accents
    tintBg:   "#E8F5E9",   // Soft green badge background
    tintBorder:"#BBF7D0",  // Soft green border
  },

  // Brand logo colors
  logo: {
    green:    "#025f00",   // Logo green
    gray:     "#504c4c",   // Logo gray
  },

  // Screen and card backgrounds
  bg: {
    screen:   "#FFFFFF",   // Main screen background
    card:     "#FFFFFF",   // Card background
    muted:    "#F9FAFB",   // Light input background
    border:   "#E5E7EB",   // Card and input border
  },

  // Text colors
  text: {
    primary:  "#111827",   // Headings and main text
    secondary:"#374151",   // Body text
    logo:     "#504c4c",   // Label and meta text
    muted:    "#6B7280",   // Subtitles and timestamps
    placeholder:"#9CA3AF", // Input placeholder
    inverse:  "#F0FDF4",   // Text on dark green backgrounds
  },

  // Risk level colors
  risk: {
    none:     "#4ADE80",
    low:      "#4ADE80",
    moderate: "#EAB308",
    high:     "#EF4444",
  },
};

export default Colors;
