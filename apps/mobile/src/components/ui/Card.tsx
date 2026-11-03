import React from "react";
import { View, StyleSheet, ViewProps } from "react-native";
import { theme } from "../../theme";

export interface CardProps extends ViewProps {
  /** Optional inner padding variant */
  padding?: "none" | "sm" | "md" | "lg";
  /** Children elements inside card container */
  children: React.ReactNode;
}

/**
 * Surface card container with consistent border radius, background, and drop shadow.
 */
export const Card: React.FC<CardProps> = ({
  padding = "md",
  children,
  style,
  ...props
}) => {
  return (
    <View
      style={[
        styles.card,
        padding === "none" && styles.paddingNone,
        padding === "sm" && styles.paddingSm,
        padding === "md" && styles.paddingMd,
        padding === "lg" && styles.paddingLg,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  paddingNone: {
    padding: 0,
  },
  paddingSm: {
    padding: theme.spacing.sm,
  },
  paddingMd: {
    padding: theme.spacing.md,
  },
  paddingLg: {
    padding: theme.spacing.lg,
  },
});
