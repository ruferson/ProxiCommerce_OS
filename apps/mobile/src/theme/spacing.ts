/**
 * @file spacing.ts
 * @description Spacing and border radius tokens for ProxiCommerce OS.
 * Implements an 8-point grid rhythm along with standardized corner curvatures.
 */

/**
 * Spacing tokens based on an 8pt grid system.
 */
export const spacing = {
  /** 4pt - Minimal spacing for tight badges, icons, and micro-offsets */
  xs: 4,
  /** 8pt - Compact spacing for item gaps, small paddings, and button insets */
  sm: 8,
  /** 16pt - Standard spacing for margins, container paddings, and card content */
  md: 16,
  /** 24pt - Large spacing for screen padding and major section separators */
  lg: 24,
  /** 32pt - Extra large spacing for modal offsets and floating element margins */
  xl: 32,
  /** 40pt - Double extra large spacing for hero spacing and generous bottom insets */
  xxl: 40,
} as const;

/**
 * Standard border radius tokens for container corners, buttons, and chips.
 */
export const borderRadius = {
  /** 8pt - Subtle corner rounding for badges and small controls */
  sm: 8,
  /** 12pt - Medium rounding for form inputs and standard buttons */
  md: 12,
  /** 16pt - Prominent rounding for cards and product thumbnails */
  lg: 16,
  /** 20pt - Expressive rounding for floating action bars and pills */
  xl: 20,
  /** 28pt - Heavy rounding for bottom sheet modals and card corners */
  xxl: 28,
  /** 9999pt - Fully rounded circular shape */
  full: 9999,
} as const;

/** Type definition for spacing tokens */
export type Spacing = typeof spacing;

/** Type definition for border radius tokens */
export type BorderRadius = typeof borderRadius;

