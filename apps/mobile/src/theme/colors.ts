/**
 * @file colors.ts
 * @description Color palette tokens for ProxiCommerce OS.
 * Warm-neutral base with soft violet primary. Designed for extended POS sessions:
 * low contrast fatigue, professional legibility, paper-like surface warmth.
 */

/**
 * Color palette tokens following a semantic scale.
 */
export const colors = {
  /**
   * Primary – soft violet/periwinkle. Muted enough to avoid visual strain,
   * distinctive enough to anchor brand identity and interactive states.
   */
  primary: {
    50: "#eeeeff",   // near-white lavender tint – active card surfaces
    100: "#ddddf5",  // light periwinkle – pill/badge backgrounds
    200: "#c0bfe8",  // muted lavender – hover / selected borders
    300: "#a8a6df",  // soft periwinkle – subtle accent borders
    400: "#8e8cd3",  // medium periwinkle
    500: "#7b79c8",  // soft indigo – icons, highlights
    600: "#6260b0",  // medium violet – primary buttons, prices
    700: "#4d4c95",  // deep violet – text on light surfaces
  },

  /**
   * Neutral – warm stone. Avoids cold blue-gray fatigue by tinting toward
   * sand/parchment. All surfaces feel like quality paper.
   */
  neutral: {
    50: "#f8f6f2",   // warm off-white – main app background
    100: "#f0ede6",  // warm light cream – card surfaces
    200: "#e1ddd4",  // warm beige – dividers, borders
    300: "#c5bfb3",  // warm medium stone – inactive borders
    400: "#9a9388",  // warm gray – placeholder text, icons
    500: "#706a5f",  // warm gray-brown – secondary/caption text
    600: "#504b41",  // dark warm gray – body text
    700: "#353028",  // charcoal brown – headings
    800: "#231f17",  // deep charcoal – modal titles
    900: "#141009",  // near black (warm) – CartBar surface
  },

  /**
   * Status – muted functional colors. Soft enough not to alarm, clear enough
   * to communicate state without confusion.
   */
  status: {
    error: "#b85858",       // muted rose-red – destructive actions
    errorLight: "#f5eaea",  // very light rose – error backgrounds
    success: "#4a9e7e",     // soft teal-green – confirmations
    successLight: "#e8f4f0",// light teal – success badge backgrounds
    warning: "#b8822e",     // muted amber – warnings
    warningLight: "#f4f0e6",// light amber – warning backgrounds
  },

  /**
   * Payment-method accent colors.
   * Each has a full (icon/text) and light (badge background) variant.
   */
  payment: {
    cash: "#4a9e7e",
    cashLight: "#e8f4f0",
    nfc: "#6260b0",
    nfcLight: "#ddddf5",
    aiScan: "#b8822e",
    aiScanLight: "#f4efe4",
    web: "#4a7eb8",
    webLight: "#e4edf5",
  },

  /**
   * Surface tokens for backgrounds, cards, and overlay scrims.
   */
  background: {
    main: "#f2efe8",              // warm cream – screen canvas
    card: "#f8f6f2",              // slightly lighter – card surface
    surfaceContainer: "#e8e4db",  // warm container – stock badge, stepper bg
    overlay: "rgba(20, 16, 9, 0.5)",
  },
} as const;

/** Type definition of the color palette tokens */
export type Colors = typeof colors;
