/**
 * @file Header.tsx
 * @description Compact POS app bar with the active store identity, sync status,
 * and account actions.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SyncBadge } from "../ui/SyncBadge";
import { theme } from "../../theme";

export interface HeaderProps {
  /** Main header title text (e.g., store name or screen title) */
  title: string;
  /** Subtitle context string (e.g., terminal ID or active section) */
  subtitle: string;
  /** Signs out the current user */
  onSignOutPress: () => void;
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
  onSignOutPress,
  isOnline,
  pendingSyncCount,
  isSyncing,
  onSyncPress,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <View style={styles.storeIcon}>
          <MaterialCommunityIcons
            name="storefront-outline"
            size={22}
            color={theme.colors.primary[700]}
          />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>PROXICOMMERCE · TPV</Text>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        <View style={styles.accountActions}>
          <SyncBadge
            isOnline={isOnline}
            pendingCount={pendingSyncCount}
            isSyncing={isSyncing}
            onSyncPress={onSyncPress}
          />
          <TouchableOpacity
            onPress={onSignOutPress}
            style={styles.signOutButton}
            activeOpacity={0.7}
            accessibilityLabel="Cerrar sesión"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="logout"
              size={20}
              color={theme.colors.neutral[600]}
            />
          </TouchableOpacity>
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
    borderBottomColor: theme.colors.neutral[100],
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 58,
  },
  storeIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.sm,
  },
  titleBlock: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[600],
    marginBottom: 2,
  },
  title: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[900],
  },
  subtitle: {
    fontSize: 11,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  accountActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  signOutButton: {
    width: 42,
    height: 42,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
});
