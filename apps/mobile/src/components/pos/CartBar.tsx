import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "../ui/Button";
import { theme } from "../../theme";

export interface CartBarProps {
  /** Count of items in active cart */
  totalItems: number;
  /** Combined price sum in Euros */
  totalPrice: number;
  /** Callback handler to trigger checkout modal */
  onCheckoutPress: () => void;
}

/**
 * Expressive floating bottom checkout bar.
 */
export const CartBar: React.FC<CartBarProps> = ({
  totalItems,
  totalPrice,
  onCheckoutPress,
}) => {
  if (totalItems === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.infoContainer}>
        <Text style={styles.itemCountText}>
          {totalItems} {totalItems === 1 ? "producto" : "productos"}
        </Text>
        <Text style={styles.totalPriceText}>{totalPrice.toFixed(2)} €</Text>
      </View>
      <Button
        title="Cobrar ticket"
        variant="primary"
        onPress={onCheckoutPress}
        style={styles.checkoutButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: theme.spacing.lg,
    left: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: theme.colors.neutral[900],
    borderRadius: theme.borderRadius.xxl,
    padding: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  infoContainer: {
    flex: 1,
  },
  itemCountText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[400],
    fontWeight: theme.typography.fontWeight.medium,
  },
  totalPriceText: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: "#ffffff",
    marginTop: 2,
  },
  checkoutButton: {
    minWidth: 130,
    borderRadius: theme.borderRadius.xl,
  },
});
