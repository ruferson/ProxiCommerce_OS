/**
 * @file index.ts
 * @description Central theme barrel file exporting unified design tokens for colors,
 * typography, spacing, and border radius.
 */

import { colors } from "./colors";
import { spacing, borderRadius } from "./spacing";
import { typography } from "./typography";

/**
 * Centralized theme configuration object combining all design tokens.
 */
export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
} as const;

/** Complete ProxiCommerce OS theme type */
export type Theme = typeof theme;

// Re-export individual token definitions and types for convenient imports
export * from "./colors";
export * from "./spacing";
export * from "./typography";

