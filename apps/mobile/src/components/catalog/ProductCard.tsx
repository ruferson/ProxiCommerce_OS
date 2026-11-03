/**
 * @file ProductCard.tsx
 * @description Catalog product card component for Point-of-Sale (POS) lists.
 * Features fluid layout animations, product thumbnail preview, stock counter badges,
 * and an interactive quantity stepper for cart management.
 */

import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
  UIManager,
  LayoutAnimation,
} from "react-native";
import { Product } from "@proxi-commerce/types";
import { Card } from "../ui/Card";
import { IconButton } from "../ui/IconButton";
import { theme } from "../../theme";

// Enable experimental LayoutAnimation on Android for smooth quantity stepper transitions
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Props for the `ProductCard` component.
 */
export interface ProductCardProps {
  /** Product entity model */
  product: Product;
  /** Quantity of this specific product currently in cart */
  cartQuantity: number;
  /** Callback triggered to add item to cart or increment quantity */
  onAdd: () => void;
  /** Callback triggered to remove item from cart or decrement quantity */
  onRemove: () => void;
  /** Callback triggered to open product editing form */
  onEdit: () => void;
}

/**
 * Material 3 Expressive Product Card component with fluid layout transitions for POS.
 *
 * @param {ProductCardProps} props - Component properties.
 * @returns {React.ReactElement} Rendered product card item.
 */
export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  cartQuantity,
  onAdd,
  onRemove,
  onEdit,
}) => {
  const isInCart = cartQuantity > 0;

  /**
   * Triggers layout animation before incrementing the cart quantity.
   */
  const handleAdd = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onAdd();
  };

  /**
   * Triggers layout animation before decrementing the cart quantity.
   */
  const handleRemove = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onRemove();
  };

  return (
    <Card style={[styles.card, isInCart && styles.cardActive]}>
      {/* Tap card body to open edit dialog */}
      <TouchableOpacity
        style={styles.cardContent}
        activeOpacity={0.7}
        onPress={onEdit}
      >
        {/* Product photo thumbnail */}
        <Image
          source={{ uri: product.image_uri }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Textual product details: title, price, and current stock */}
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {product.title}
          </Text>
          <Text style={styles.price}>{product.price.toFixed(2)} €</Text>
          <View style={styles.stockBadge}>
            <Text style={styles.stockText}>Stock: {product.stock_count}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Cart quantity control action container */}
      <View style={styles.actionContainer}>
        {isInCart ? (
          // Active stepper pill when product is in cart
          <View style={styles.stepperPill}>
            <IconButton
              icon="-"
              onPress={handleRemove}
              variant="outline"
              size="md"
              style={styles.stepperButton}
            />
            <Text style={styles.quantityText}>{cartQuantity}</Text>
            <IconButton
              icon="+"
              onPress={handleAdd}
              variant="primary"
              size="md"
              style={styles.stepperButton}
            />
          </View>
        ) : (
          // Single add icon button when product is not yet in cart
          <IconButton
            icon="+"
            onPress={handleAdd}
            variant="primary"
            size="md"
            style={styles.addButton}
          />
        )}
      </View>
    </Card>
  );
};

// --- Stylesheet ---
const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.xxl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 96,
  },
  cardActive: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[500],
  },
  cardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: theme.spacing.sm,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.background.surfaceContainer,
  },
  infoContainer: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[900],
  },
  price: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[600],
    marginTop: 2,
  },
  stockBadge: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.background.surfaceContainer,
    paddingHorizontal: theme.spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.xs,
  },
  stockText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[600],
    fontWeight: theme.typography.fontWeight.semibold,
  },
  actionContainer: {
    justifyContent: "center",
    alignItems: "flex-end",
    minWidth: 44,
  },
  addButton: {
    borderRadius: theme.borderRadius.xl,
    width: 44,
    height: 44,
  },
  stepperPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.xxl,
    padding: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
  },
  stepperButton: {
    borderRadius: theme.borderRadius.lg,
    width: 36,
    height: 36,
  },
  quantityText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    minWidth: 24,
    textAlign: "center",
    marginHorizontal: theme.spacing.xs,
    color: theme.colors.neutral[900],
  },
});

