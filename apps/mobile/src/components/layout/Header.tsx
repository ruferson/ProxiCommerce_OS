/**
 * @file Header.tsx
 * @description Responsive POS app bar organized into a two-tier layout:
 * - Top row: Store identity (icon, brand eyebrow, store title, subtitle) and quick action buttons (AI ticket, Drive, Logout)
 * - Bottom row: Sync & connectivity badge strip with ample breathing room so titles never wrap vertically.
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SyncBadge } from "../ui/SyncBadge";
import { theme } from "../../theme";

export interface HeaderProps {
  /** Main header title text (e.g., store name or screen title) */
  title: string;
  /** Subtitle context string (e.g., terminal ID or active section) */
  subtitle: string;
  /** Opens the manual Google Drive backup and restore modal */
  onBackupPress: () => void;
  /** Opens the AI purchase receipt scanner modal */
  onScanReceiptPress?: () => void;
  /** Signs out the current user */
  onSignOutPress: () => void;
  /** Device online status */
  isOnline: boolean;
  /** Whether Supabase cloud synchronization is enabled */
  isCloudSyncEnabled: boolean;
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
  onBackupPress,
  onScanReceiptPress,
  onSignOutPress,
  isOnline,
  isCloudSyncEnabled,
  pendingSyncCount,
  isSyncing,
  onSyncPress,
}) => {
  return (
    <View style={styles.header}>
      {/* Tier 1: Store Brand & Identity (Left) + Action Buttons Toolbar (Right) */}
      <View style={styles.topRow}>
        <View style={styles.storeIdentityBlock}>
          <View style={styles.storeIcon}>
            <MaterialCommunityIcons
              name="storefront-outline"
              size={22}
              color={theme.colors.primary[700]}
            />
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow} numberOfLines={1}>
              PROXICOMMERCE · TPV
            </Text>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </View>

        <View style={styles.actionButtonsRow}>
          {onScanReceiptPress && (
            <TouchableOpacity
              onPress={onScanReceiptPress}
              style={styles.actionButton}
              activeOpacity={0.7}
              accessibilityLabel="Escanear ticket de compra con IA"
              accessibilityHint="Extrae artículos de un recibo con IA para descontar stock"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons
                name="receipt-text-arrow-right"
                size={19}
                color={theme.colors.primary[600]}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={onBackupPress}
            style={styles.actionButton}
            activeOpacity={0.7}
            accessibilityLabel="Copia manual en Google Drive"
            accessibilityHint="Exporta o restaura una copia; no sincroniza automáticamente"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="google-drive"
              size={19}
              color={theme.colors.neutral[600]}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onSignOutPress}
            style={styles.actionButton}
            activeOpacity={0.7}
            accessibilityLabel="Cerrar sesión"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="logout"
              size={19}
              color={theme.colors.neutral[600]}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tier 2: Connectivity & Sync Status Strip */}
      <View style={styles.statusRow}>
        <SyncBadge
          isEnabled={isCloudSyncEnabled}
          isOnline={isOnline}
          pendingCount={pendingSyncCount}
          isSyncing={isSyncing}
          onSyncPress={onSyncPress}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm + 2,
    backgroundColor: theme.colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    gap: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  storeIdentityBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    marginRight: theme.spacing.sm,
  },
  storeIcon: {
    width: 42,
    height: 42,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.xs + 4,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[600],
  },
  title: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[900],
  },
  subtitle: {
    fontSize: 11,
    color: theme.colors.neutral[500],
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.neutral[100],
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    alignItems: "center",
    justifyContent: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
