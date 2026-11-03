/**
 * @file Header.tsx
 * @description Top navigation and app bar header presenting screen titles and primary actions.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "../ui/Button";
import { theme } from "../../theme";

/**
 * Props for the `Header` component.
 */
export interface HeaderProps {
  /** Main header title text */
  title: string;
  /** Subtitle context string */
  subtitle: string;
  /** Primary action callback handler for adding new entities */
  onAddPress: () => void;
}

/**
 * Expressive App Bar Header component.
 *
 * @param {HeaderProps} props - Component properties.
 * @returns {React.ReactElement} Rendered app bar header.
 */
export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onAddPress,
}) => {
  return (
    <View style={styles.header}>
      {/* Title & subtitle context block */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* Primary header action trigger */}
      <Button title="+ Nuevo" onPress={onAddPress} style={styles.addButton} />
    </View>
  );
};

// --- Stylesheet ---
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleContainer: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[900],
  },
  subtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  addButton: {
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.md,
  },
});

