import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { Product } from "@proxi-commerce/types";
import { Card } from "../ui/Card";
import { IconButton } from "../ui/IconButton";
import { theme } from "../../theme";

export interface ProductCardProps {
  /** Product entity */
  product: Product;
  /** Callback triggered when incrementing or decrementing stock */
  onUpdateStock: (productId: string, newStock: number) => void;
}

/**
 * Renders an individual product item card using atomic UI components.
 */
export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onUpdateStock,
}) => {
  return (
    <Card style={styles.card}>
      <Image
        source={{ uri: product.image_uri }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {product.title}
        </Text>
        <Text style={styles.price}>{product.price.toFixed(2)} €</Text>
        <Text style={styles.stock}>
          Stock disponible:{" "}
          <Text style={styles.stockValue}>{product.stock_count}</Text>
        </Text>
      </View>
      <View style={styles.controls}>
        <IconButton
          icon="-"
          onPress={() =>
            onUpdateStock(product.id, Math.max(0, product.stock_count - 1))
          }
        />
        <IconButton
          icon="+"
          style={styles.incrementButton}
          onPress={() => onUpdateStock(product.id, product.stock_count + 1)}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },
  image: {
    width: 68,
    height: 68,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.neutral[100],
  },
  info: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.neutral[800],
  },
  price: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[600],
    marginTop: 2,
  },
  stock: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
    marginTop: theme.spacing.xs,
  },
  stockValue: {
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[700],
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
  },
  incrementButton: {
    marginLeft: theme.spacing.xs,
  },
});
