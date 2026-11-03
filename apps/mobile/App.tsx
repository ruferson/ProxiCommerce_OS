import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Product } from "@proxi-commerce/types";
import { initDatabase } from "./src/db/schema";
import { useCatalog } from "./src/hooks/useCatalog";
import { useCart } from "./src/hooks/useCart";
import { Header } from "./src/components/layout/Header";
import { ProductCard } from "./src/components/catalog/ProductCard";
import { ProductFormModal } from "./src/components/catalog/ProductFormModal";
import { CartBar } from "./src/components/pos/CartBar";
import { CheckoutModal } from "./src/components/pos/CheckoutModal";
import { theme } from "./src/theme";

const DEMO_STORE_ID = "store_local_001";

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);

  const { products, loading, addProduct, editProduct, refreshProducts } =
    useCatalog();
  const { cart, total, totalItems, addToCart, removeFromCart, clearCart } =
    useCart();

  useEffect(() => {
    initDatabase()
      .then(() => setIsDbReady(true))
      .catch((err) =>
        console.error("Error initializing local SQLite DB:", err),
      );
  }, []);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setProductModalVisible(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setProductModalVisible(true);
  };

  const handleSaveProduct = async (
    productData: Omit<Product, "created_at" | "updated_at">,
  ) => {
    if (editingProduct) {
      await editProduct(productData);
    } else {
      await addProduct(productData);
    }
  };

  const handleSuccessfulCheckout = async () => {
    clearCart();
    await refreshProducts();
  };

  if (!isDbReady || loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary[600]} />
        <Text style={styles.loadingText}>Cargando base de datos local...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />

        <Header
          title="ProxiCommerce OS"
          subtitle="Catálogo Local (Offline-First)"
          onAddPress={handleOpenAddModal}
        />

        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            totalItems > 0 && styles.listContentWithCartBar,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Sin productos registrados</Text>
              <Text style={styles.emptySubtext}>
                Añade el primer producto utilizando el botón "+ Nuevo".
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const cartItem = cart.find((c) => c.product.id === item.id);
            const cartQuantity = cartItem ? cartItem.quantity : 0;

            return (
              <ProductCard
                product={item}
                cartQuantity={cartQuantity}
                onAdd={() => addToCart(item)}
                onRemove={() => removeFromCart(item.id)}
                onEdit={() => handleOpenEditModal(item)}
              />
            );
          }}
        />

        <CartBar
          totalItems={totalItems}
          totalPrice={total}
          onCheckoutPress={() => setCheckoutModalVisible(true)}
        />

        <ProductFormModal
          visible={productModalVisible}
          onClose={() => setProductModalVisible(false)}
          onSave={handleSaveProduct}
          storeId={DEMO_STORE_ID}
          initialProduct={editingProduct}
        />

        <CheckoutModal
          visible={checkoutModalVisible}
          onClose={() => setCheckoutModalVisible(false)}
          cart={cart}
          total={total}
          storeId={DEMO_STORE_ID}
          onRemoveItem={removeFromCart}
          onSuccess={handleSuccessfulCheckout}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.main,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background.main,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.neutral[500],
  },
  listContent: {
    padding: theme.spacing.md,
  },
  listContentWithCartBar: {
    paddingBottom: theme.spacing.xxl * 2,
  },
  emptyContainer: {
    padding: theme.spacing.xxl,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.neutral[700],
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[400],
    textAlign: "center",
    marginTop: theme.spacing.xs,
  },
});
