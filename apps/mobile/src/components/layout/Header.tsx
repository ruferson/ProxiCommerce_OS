/**
 * @file Header.tsx
 * @description Unified top app bar for ProxiCommerce TPV. Presents brand identity,
 * automated real-time background sync status (via SyncBadge), and responsive
 * POS action buttons (barcode scanner, cash register closure, history, and entity creation).
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button } from "../ui/Button";
import { SyncBadge } from "../ui/SyncBadge";
import { theme } from "../../theme";

export interface HeaderProps {
  /** Main header title text (e.g., store name or screen title) */
  title: string;
  /** Subtitle context string (e.g., terminal ID or active section) */
  subtitle: string;
  /** Primary action callback handler for adding new items or manual entries */
  onAddPress?: () => void;
  /** Title label for the primary action button */
  addLabel?: string;
  /** Optional callback to open the camera barcode scanner */
  onScanPress?: () => void;
  /** Optional callback to open the transaction history screen */
  onHistoryPress?: () => void;
  /** Optional callback to open the dedicated Arqueo Z / Cash Closure modal */
  onArqueoPress?: () => void;
  /** Device online status */
  isOnline: boolean;
  /** Count of pending offline operations in SQLite queue */
  pendingSyncCount: number;
  /** Active sync indicator state */
  isSyncing: boolean;
  /** Manual trigger for queue upload */
  onSyncPress: () => void | Promise<void>;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onAddPress,
  addLabel = "+ Nuevo",
  onScanPress,
  onHistoryPress,
  onArqueoPress,
  isOnline,
  pendingSyncCount,
  isSyncing,
  onSyncPress,
}) => {
  return (
    <View style={styles.header}>
      {/* Tier 1: Brand / Screen Title & Live Sync Status Badge */}
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* Real-time background sync monitor */}
        <SyncBadge
          isOnline={isOnline}
          pendingCount={pendingSyncCount}
          isSyncing={isSyncing}
          onSyncPress={onSyncPress}
        />
      </View>

      {/* Tier 2: Context Subtitle & Quick POS Actions Toolbar */}
      <View style={styles.bottomRow}>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>

        <View style={styles.actionsGroup}>
          {/* Barcode scanner action */}
          {onScanPress && (
            <TouchableOpacity
              onPress={onScanPress}
              style={styles.iconHeaderBtn}
              activeOpacity={0.7}
              accessibilityLabel="Escanear código de barras"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons
                name="barcode-scan"
                size={18}
                color={theme.colors.primary[600]}
              />
            </TouchableOpacity>
          )}

          {/* Arqueo Z / Cash closure action */}
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

          {/* Transaction history action */}
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

          {/* Primary CTA button */}
          {onAddPress && (
            <Button
              title={addLabel}
              onPress={onAddPress}
              style={styles.addButton}
            />
          )}
        </View>
      </View>
    </View>
  );
};

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
  titleBlock: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[900],
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
