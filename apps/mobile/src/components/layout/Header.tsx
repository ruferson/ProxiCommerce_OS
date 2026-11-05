/**
 * @file Header.tsx
 * @description Top navigation and app bar header presenting brand identity, offline sync status,
 * screen context, and primary POS action buttons in a responsive two-tier layout.
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button } from "../ui/Button";
import { theme } from "../../theme";

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
  /** Device internet connectivity state */
  isOnline?: boolean;
  /** Number of pending mutations awaiting synchronization */
  pendingSyncCount?: number;
  /** Active sync operation state */
  isSyncing?: boolean;
  /** Optional trigger to force manual synchronization */
  onSyncPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onAddPress,
  onScanPress,
  onHistoryPress,
  onArqueoPress,
  isOnline = true,
  pendingSyncCount = 0,
  isSyncing = false,
  onSyncPress,
}) => {
  return (
    <View style={styles.header}>
      {/* Tier 1: Brand Title & Sync State Pill */}
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <TouchableOpacity
          style={[
            styles.syncPill,
            !isOnline
              ? styles.syncPillOffline
              : isSyncing
                ? styles.syncPillSyncing
                : pendingSyncCount > 0
                  ? styles.syncPillPending
                  : styles.syncPillOnline,
          ]}
          onPress={onSyncPress}
          activeOpacity={0.7}
          disabled={!onSyncPress}
        >
          <MaterialCommunityIcons
            name={
              !isOnline
                ? "cloud-off-outline"
                : isSyncing
                  ? "cloud-sync-outline"
                  : pendingSyncCount > 0
                    ? "cloud-upload-outline"
                    : "cloud-check-outline"
            }
            size={13}
            color={
              !isOnline
                ? theme.colors.neutral[600]
                : isSyncing || pendingSyncCount > 0
                  ? theme.colors.primary[700]
                  : theme.colors.payment.cash
            }
          />
          <Text
            style={[
              styles.syncPillText,
              {
                color: !isOnline
                  ? theme.colors.neutral[600]
                  : isSyncing || pendingSyncCount > 0
                    ? theme.colors.primary[700]
                    : theme.colors.payment.cash,
              },
            ]}
          >
            {!isOnline
              ? `Offline${pendingSyncCount > 0 ? ` (${pendingSyncCount})` : ""}`
              : isSyncing
                ? "Subiendo..."
                : pendingSyncCount > 0
                  ? `${pendingSyncCount} pendientes`
                  : "Online"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tier 2: Screen Subtitle & Quick POS Actions Toolbar */}
      <View style={styles.bottomRow}>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>

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
                size={18}
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
                size={18}
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
                size={18}
                color={theme.colors.neutral[600]}
              />
            </TouchableOpacity>
          )}

          {/* Primary header action trigger */}
          <Button
            title="+ Nuevo"
            onPress={onAddPress}
            style={styles.addButton}
          />
        </View>
      </View>
    </View>
  );
};

// --- Stylesheet ---
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    gap: theme.spacing.xs + 2,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[900],
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  syncPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xs + 3,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    gap: 4,
    borderWidth: 1,
  },
  syncPillOnline: {
    backgroundColor: theme.colors.payment.cashLight,
    borderColor: "#c1e3d3",
  },
  syncPillOffline: {
    backgroundColor: theme.colors.neutral[200],
    borderColor: theme.colors.neutral[300],
  },
  syncPillPending: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[200],
  },
  syncPillSyncing: {
    backgroundColor: theme.colors.primary[100],
    borderColor: theme.colors.primary[200],
  },
  syncPillText: {
    fontSize: 10,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  actionsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.neutral[100],
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: 6,
    minHeight: 36,
  },
});
