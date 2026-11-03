import { colors } from "./colors";
import { spacing, borderRadius } from "./spacing";
import { typography } from "./typography";

/**
 * Centralized theme configuration object.
 */
export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
} as const;

export type Theme = typeof theme;
