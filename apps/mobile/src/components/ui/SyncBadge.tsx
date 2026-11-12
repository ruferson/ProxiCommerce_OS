/**
 * @file SyncBadge.tsx
 * @description Compact UI status badge indicating internet connectivity,
 * pending local operations count, and ongoing cloud synchronization.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../theme";

export interface SyncBadgeProps {
  /** Whether automatic synchronization with Supabase was enabled at sign-up */
  isEnabled: boolean;
  /** Current network status */
  isOnline: boolean;
  /** Current count of pending operations */
  pendingCount: number;
  /** Whether a sync cycle is active */
  isSyncing: boolean;
  /** Manually triggers a sync cycle */
  onSyncPress: () => void | Promise<void>;
}

export const SyncBadge: React.FC<SyncBadgeProps> = ({
  isEnabled,
  isOnline,
  pendingCount,
  isSyncing,
  onSyncPress,
}) => {
  if (!isEnabled) {
    return (
      <View style={[styles.badge, styles.disabledBadge]}>
        <MaterialCommunityIcons
          name="cloud-off-outline"
          size={14}
          color={theme.colors.neutral[500]}
        />
        <Text style={styles.disabledText}>Supabase desactivado</Text>
      </View>
    );
  }

  // 1. Device Offline State
  if (!isOnline) {
    return (
      <View style={[styles.badge, styles.offlineBadge]}>
        <MaterialCommunityIcons
          name="cloud-off-outline"
          size={14}
          color={theme.colors.status.warning}
        />
        <Text style={styles.offlineText}>
          Supabase offline ({pendingCount})
        </Text>
      </View>
    );
  }

  // 2. Active Syncing State
  if (isSyncing) {
    return (
      <View style={[styles.badge, styles.syncingBadge]}>
        <ActivityIndicator size="small" color={theme.colors.primary[600]} />
        <Text style={styles.syncingText}>Enviando a Supabase...</Text>
      </View>
    );
  }

  // 3. Pending Items State (Connected but queue has items)
  if (pendingCount > 0) {
    return (
      <TouchableOpacity
        style={[styles.badge, styles.pendingBadge]}
        onPress={onSyncPress}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="cloud-upload-outline"
          size={14}
          color={theme.colors.primary[600]}
        />
        <Text style={styles.pendingText}>
          {pendingCount} pendientes Supabase
        </Text>
      </TouchableOpacity>
    );
  }

  // 4. Fully Synced State
  return (
    <View style={[styles.badge, styles.syncedBadge]}>
      <MaterialCommunityIcons
        name="cloud-check-outline"
        size={14}
        color={theme.colors.status.success}
      />
      <Text style={styles.syncedText}>Supabase al día</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  offlineBadge: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FCD34D",
    borderWidth: 1,
  },
  offlineText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: "#B45309",
  },
  syncingBadge: {
    backgroundColor: theme.colors.primary[50],
  },
  syncingText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary[700],
  },
  pendingBadge: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[200],
    borderWidth: 1,
  },
  pendingText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[700],
  },
  syncedBadge: {
    backgroundColor: theme.colors.status.successLight,
  },
  syncedText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.status.success,
  },
  disabledBadge: {
    backgroundColor: theme.colors.neutral[100],
  },
  disabledText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.neutral[600],
  },
});
