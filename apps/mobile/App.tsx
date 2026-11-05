import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  FlatList,
  Alert,
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
import { SalesHistoryModal } from "./src/components/pos/SalesHistoryModal";
import { RefundModal } from "./src/components/pos/RefundModal";
import { ArqueoScreenModal } from "./src/components/pos/ArqueoScreenModal";
import { BarcodeScannerModal } from "./src/components/pos/BarcodeScannerModal";
import { getProductByBarcode } from "./src/services/catalogService";
import { theme } from "./src/theme";
import { useSyncEngine } from "./src/hooks/useSyncEngine";

const DEMO_STORE_ID = "store_local_001";

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prefilledBarcode, setPrefilledBarcode] = useState<string | undefined>(undefined);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [arqueoModalVisible, setArqueoModalVisible] = useState(false);
  const [barcodeScannerVisible, setBarcodeScannerVisible] = useState(false);
  const [refundTransactionId, setRefundTransactionId] = useState<string | null>(
    null,
  );
  const { isOnline, pendingCount, isSyncing, forceSync } = useSyncEngine();

  const {
    products,
    loading,
    addProduct,
    editProduct,
    deleteProduct,
    refreshProducts,
  } = useCatalog();
  const {
    cart,
    total,
    totalItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  } = useCart();

  useEffect(() => {
    initDatabase()
      .then(() => setIsDbReady(true))
      .catch((err) =>
        console.error("Error initializing local SQLite DB:", err),
      );
  }, []);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setPrefilledBarcode(undefined);
    setProductModalVisible(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setPrefilledBarcode(undefined);
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

  /**
   * Deletes a product from local SQLite storage and evicts it from the active cart if present.
   */
  const handleDeleteProduct = async (productId: string) => {
    // Remove deleted item from the active cart session to keep totals accurate
    updateQuantity(productId, 0);
    // Persist deletion to SQLite database
    await deleteProduct(productId);
  };

  const handleSuccessfulCheckout = async () => {
    clearCart();
    await refreshProducts();
  };

  /**
   * Fast POS Barcode Scanner Handler.
   * Looks up product in SQLite by scanned barcode:
   * - If found and stock > 0: adds directly to cart.
   * - If found and out of stock: notifies user.
   * - If not found: offers to register it directly as a new product with the scanned barcode pre-filled.
   */
  const handleBarcodeScannedPOS = async (scannedData: string) => {
    try {
      const match = await getProductByBarcode(scannedData);
      if (match) {
        if (match.stock_count <= 0) {
          Alert.alert(
            "Sin stock disponible",
            `El producto "${match.title}" no dispone de existencias para venta.`,
          );
          return;
        }
        addToCart(match);
        setBarcodeScannerVisible(false);
      } else {
        // Product not registered yet
        Alert.alert(
          "Producto no encontrado",
          `No existe ningún artículo registrado con el código:\n${scannedData}\n\n¿Deseas darlo de alta ahora?`,
          [
            { text: "Seguir escaneando", style: "cancel" },
            {
              text: "Crear Producto",
              style: "default",
              onPress: () => {
                setBarcodeScannerVisible(false);
                setEditingProduct(null);
                setPrefilledBarcode(scannedData);
                setProductModalVisible(true);
              },
            },
          ],
        );
      }
    } catch (err) {
      console.error("Error al buscar producto por código de barras:", err);
    }
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
          onScanPress={() => setBarcodeScannerVisible(true)}
          onHistoryPress={() => setHistoryModalVisible(true)}
          onArqueoPress={() => setArqueoModalVisible(true)}
          isOnline={isOnline}
          pendingSyncCount={pendingCount}
          isSyncing={isSyncing}
          onSyncPress={forceSync}
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
          onDelete={handleDeleteProduct}
          storeId={DEMO_STORE_ID}
          initialProduct={editingProduct}
          initialBarcode={prefilledBarcode}
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

        <SalesHistoryModal
          visible={historyModalVisible}
          onClose={() => setHistoryModalVisible(false)}
          onRefundPress={(txId) => {
            setHistoryModalVisible(false);
            setRefundTransactionId(txId);
          }}
          onOpenArqueoScreen={() => {
            setHistoryModalVisible(false);
            setArqueoModalVisible(true);
          }}
        />

        <ArqueoScreenModal
          visible={arqueoModalVisible}
          onClose={() => setArqueoModalVisible(false)}
        />

        <RefundModal
          visible={refundTransactionId !== null}
          transactionId={refundTransactionId}
          onClose={() => setRefundTransactionId(null)}
          onRefundSuccess={async () => {
            setRefundTransactionId(null);
            await refreshProducts();
          }}
        />

        <BarcodeScannerModal
          visible={barcodeScannerVisible}
          title="Cobro Rápido en Caja"
          onBarcodeScanned={handleBarcodeScannedPOS}
          onClose={() => setBarcodeScannerVisible(false)}
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
