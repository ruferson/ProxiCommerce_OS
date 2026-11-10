/**
 * @file BottomNavigation.tsx
 * @description POS navigation bar with a prominent central product-creation action.
 */

import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../theme";

export interface BottomNavigationProps {
  onScanPress: () => void;
  onHistoryPress: () => void;
  onAddPress: () => void;
  onArqueoPress: () => void;
  onCatalogSyncPress: () => void;
  isCatalogSyncing: boolean;
}

interface NavigationItemProps {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  onPress: () => void;
  color?: string;
  disabled?: boolean;
  loading?: boolean;
}

const NavigationItem: React.FC<NavigationItemProps> = ({
  label,
  icon,
  onPress,
  color = theme.colors.neutral[600],
  disabled = false,
  loading = false,
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={styles.navigationItem}
    activeOpacity={0.7}
    disabled={disabled}
    accessibilityLabel={label}
    accessibilityRole="button"
  >
    {loading ? (
      <ActivityIndicator size="small" color={color} />
    ) : (
      <MaterialCommunityIcons name={icon} size={22} color={color} />
    )}
    <Text style={styles.navigationLabel} numberOfLines={1}>
      {label}
    </Text>
  </TouchableOpacity>
);

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  onScanPress,
  onHistoryPress,
  onAddPress,
  onArqueoPress,
  onCatalogSyncPress,
  isCatalogSyncing,
}) => (
  <View style={styles.container}>
    <NavigationItem
      label="Escanear"
      icon="barcode-scan"
      onPress={onScanPress}
      color={theme.colors.primary[600]}
    />
    <NavigationItem
      label="Ventas"
      icon="receipt-text-outline"
      onPress={onHistoryPress}
    />
    <TouchableOpacity
      onPress={onAddPress}
      style={styles.addItem}
      activeOpacity={0.8}
      accessibilityLabel="Añadir producto nuevo"
      accessibilityRole="button"
    >
      <View style={styles.addButton}>
        <MaterialCommunityIcons name="plus" size={30} color="#ffffff" />
      </View>
      <Text style={styles.addLabel} numberOfLines={1}>
        Nuevo producto
      </Text>
    </TouchableOpacity>
    <NavigationItem
      label="Caja"
      icon="cash-register"
      onPress={onArqueoPress}
      color={theme.colors.payment.cash}
    />
    <NavigationItem
      label="Catálogo"
      icon="cloud-sync-outline"
      onPress={onCatalogSyncPress}
      color={theme.colors.primary[600]}
      disabled={isCatalogSyncing}
      loading={isCatalogSyncing}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    height: 78,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.background.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 2,
  },
  navigationItem: {
    flex: 1,
    minWidth: 0,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  navigationLabel: {
    fontSize: 10,
    color: theme.colors.neutral[600],
    fontWeight: theme.typography.fontWeight.medium,
  },
  addItem: {
    flex: 1.25,
    height: 78,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 6,
    zIndex: 3,
  },
  addButton: {
    position: "absolute",
    top: -22,
    width: 62,
    height: 62,
    borderRadius: theme.borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary[600],
    borderWidth: 5,
    borderColor: theme.colors.background.card,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 7,
  },
  addLabel: {
    maxWidth: "100%",
    fontSize: 9,
    color: theme.colors.primary[700],
    fontWeight: theme.typography.fontWeight.semibold,
  },
});
