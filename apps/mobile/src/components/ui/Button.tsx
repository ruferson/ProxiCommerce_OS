/**
 * @file Button.tsx
 * @description Standard reusable button component with multiple style variants and loading indicator support.
 */

import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
} from "react-native";
import { theme } from "../../theme";

/**
 * Props for the `Button` component.
 */
export interface ButtonProps extends TouchableOpacityProps {
  /** Text content displayed inside the button */
  title: string;
  /** Visual hierarchy variant: primary (brand indigo), secondary (subtle grey), outline (bordered), or danger (red) */
  variant?: "primary" | "secondary" | "outline" | "danger";
  /** Shows a loading spinner instead of the text label */
  loading?: boolean;
}

/**
 * Atomic Button component for general UI actions.
 *
 * @param {ButtonProps} props - Component properties.
 * @returns {React.ReactElement} Rendered button component.
 */
export const Button: React.FC<ButtonProps> = ({
  title,
  variant = "primary",
  loading = false,
  disabled,
  style,
  ...props
}) => {
  // Variant style conditions
  const isSecondary = variant === "secondary";
  const isOutline = variant === "outline";
  const isDanger = variant === "danger";

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled || loading}
      style={[
        styles.base,
        isSecondary && styles.secondary,
        isOutline && styles.outline,
        isDanger && styles.danger,
        disabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        // Render spinner with contrasting color according to variant
        <ActivityIndicator
          color={isOutline ? theme.colors.primary[600] : "#ffffff"}
        />
      ) : (
        // Render button label text
        <Text
          style={[
            styles.text,
            isSecondary && styles.secondaryText,
            isOutline && styles.outlineText,
            isDanger && styles.dangerText,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

// --- Stylesheet ---
const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.primary[600],
    paddingVertical: theme.spacing.sm + 4,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  secondary: {
    backgroundColor: theme.colors.neutral[100],
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
  },
  danger: {
    backgroundColor: theme.colors.status.error,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: "#ffffff",
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  secondaryText: {
    color: theme.colors.neutral[700],
  },
  outlineText: {
    color: theme.colors.neutral[700],
  },
  dangerText: {
    color: "#ffffff",
  },
});

