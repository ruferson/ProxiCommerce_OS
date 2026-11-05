/**
 * @file Header.tsx
 * @description Top navigation and app bar header presenting screen titles and primary actions.
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
  /** Optional callback to open the barcode scanner for rapid cart scanning */
  onScanPress?: () => void;
  /** Optional callback to open the sales history panel */
  onHistoryPress?: () => void;
  /** Optional callback to open the dedicated full-screen Arqueo Z screen */
  onArqueoPress?: () => void;
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
  onScanPress,
  onHistoryPress,
  onArqueoPress,
}) => {
  return (
    <View style={styles.header}>
      {/* Title & subtitle context block */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* Action group */}
      <View style={styles.actionsGroup}>
        {/* Barcode scanner icon button for quick POS cart scanning */}
        {onScanPress && (
          <TouchableOpacity
            onPress={onScanPress}
            style={styles.iconHeaderBtn}
            activeOpacity={0.7}
            accessibilityLabel="Escanear código de barras para añadir al carrito"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="barcode-scan"
              size={20}
              color={theme.colors.primary[600]}
            />
          </TouchableOpacity>
        )}

        {/* Arqueo Z icon button */}
        {onArqueoPress && (
          <TouchableOpacity
            onPress={onArqueoPress}
            style={styles.iconHeaderBtn}
            activeOpacity={0.7}
            accessibilityLabel="Abrir Cierre de Caja y Arqueo Z"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="cash-register"
              size={20}
              color={theme.colors.payment.cash}
            />
          </TouchableOpacity>
        )}

        {/* History icon button */}
        {onHistoryPress && (
          <TouchableOpacity
            onPress={onHistoryPress}
            style={styles.iconHeaderBtn}
            activeOpacity={0.7}
            accessibilityLabel="Ver historial de ventas"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="receipt-text-outline"
              size={20}
              color={theme.colors.neutral[600]}
            />
          </TouchableOpacity>
        )}

        {/* Primary header action trigger */}
        <Button title="+ Nuevo" onPress={onAddPress} style={styles.addButton} />
      </View>
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
    marginRight: theme.spacing.sm,
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
  actionsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  iconHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.neutral[100],
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.md,
  },
});

