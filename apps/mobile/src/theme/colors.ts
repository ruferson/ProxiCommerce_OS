/**
 * @file colors.ts
 * @description Color palette tokens for ProxiCommerce OS mobile UI theme.
 * Defines primary branding tones, neutral surfaces, status indicators, and background layers.
 */

/**
 * Color palette tokens following a semantic scale.
 */
export const colors = {
  /** Primary brand indigo palette used for key actions, highlights, and active states */
  primary: {
    50: "#eef2ff",
    100: "#e0e7ff",
    500: "#6366f1",
    600: "#4f46e5",
    700: "#4338ca",
  },
  /** Neutral slate palette used for backgrounds, borders, dividers, and typography */
  neutral: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
  /** Functional status colors for feedback, validation, and alerts */
  status: {
    error: "#ef4444",
    success: "#10b981",
  },
  /** Background tokens for screen canvases, cards, and modal backdrops */
  background: {
    main: "#f8fafc",
    card: "#ffffff",
    surfaceContainer: "#f1f5f9",
    overlay: "rgba(15, 23, 42, 0.5)",
  },
} as const;

/** Type definition of the color palette tokens */
export type Colors = typeof colors;

