/**
 * @file IconButton.tsx
 * @description Compact touchable icon button for toolbars, counters, and micro-actions.
 */

import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  TouchableOpacityProps,
} from "react-native";
import { theme } from "../../theme";

/**
 * Props for the `IconButton` component.
 */
export interface IconButtonProps extends TouchableOpacityProps {
  /** Icon symbol or short character (e.g. "+", "-", "📷") */
  icon: string;
  /** Visual variant: default (subtle neutral), primary (brand indigo), or outline (bordered) */
  variant?: "default" | "primary" | "outline";
  /** Button dimensions size: sm (28px), md (36px), or lg (44px) */
  size?: "sm" | "md" | "lg";
}

/**
 * Compact circular/square touchable action button for icon-based triggers.
 *
 * @param {IconButtonProps} props - Component properties.
 * @returns {React.ReactElement} Rendered icon button.
 */
export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = "default",
  size = "md",
  style,
  disabled,
  ...props
}) => {
  // Determine variant styling states
  const isPrimary = variant === "primary";
  const isOutline = variant === "outline";

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      style={[
        styles.base,
        styles[size],
        isPrimary && styles.primary,
        isOutline && styles.outline,
        disabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      <Text
        style={[
          styles.text,
          styles[`${size}Text`],
          isPrimary && styles.primaryText,
          isOutline && styles.outlineText,
        ]}
      >
        {icon}
      </Text>
    </TouchableOpacity>
  );
};

// --- Stylesheet ---
const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.neutral[100],
    justifyContent: "center",
    alignItems: "center",
    borderRadius: theme.borderRadius.sm,
  },
  sm: {
    width: 28,
    height: 28,
  },
  md: {
    width: 36,
    height: 36,
  },
  lg: {
    width: 44,
    height: 44,
  },
  primary: {
    backgroundColor: theme.colors.primary[600],
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[700],
  },
  smText: {
    fontSize: theme.typography.fontSize.sm,
  },
  mdText: {
    fontSize: theme.typography.fontSize.lg,
  },
  lgText: {
    fontSize: theme.typography.fontSize.xl,
  },
  primaryText: {
    color: "#ffffff",
  },
  outlineText: {
    color: theme.colors.neutral[700],
  },
});

