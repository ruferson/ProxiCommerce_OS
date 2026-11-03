/**
 * @file typography.ts
 * @description Typography scale and font weight definitions for ProxiCommerce OS.
 * Provides consistent font sizing and weight hierarchies across the mobile application.
 */

/**
 * Typography variants and font weights.
 */
export const typography = {
  /** Font size scale in points */
  fontSize: {
    /** Extra small caption/tag text (12pt) */
    xs: 12,
    /** Small secondary text and form hints (14pt) */
    sm: 14,
    /** Medium body text and default button labels (16pt) */
    md: 16,
    /** Large subheadings and price labels (18pt) */
    lg: 18,
    /** Extra large titles and header labels (22pt) */
    xl: 22,
    /** Double extra large display prices and major headings (28pt) */
    xxl: 28,
  },
  /** Standard font weight options */
  fontWeight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
} as const;

/** Type definition for typography configuration */
export type Typography = typeof typography;

