import { useState, useEffect, useCallback } from "react";
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
import { BottomNavigation } from "./src/components/layout/BottomNavigation";
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
import { useInitialSync } from "./src/hooks/useInitialSync";
import { SyncDecisionModal } from "./src/components/sync/SyncDecisionModal";
import { BackupModal } from "./src/components/sync/BackupModal";
import { setCloudSyncEnabled } from "./src/services/syncService";
import { useAuth } from "./src/hooks/useAuth";
import { AuthScreen } from "./src/screens/AuthScreen";
import { CreateStoreScreen } from "./src/screens/CreateStoreScreen";
import { Button } from "./src/components/ui/Button";

export default function App() {
  const {
    session,
    storeId,
    storeName,
    isLoading: isAuthLoading,
    error: authError,
    refresh: refreshAuth,
    signOut,
  } = useAuth();
  const cloudSyncEnabled =
    session?.user.user_metadata?.cloud_sync_enabled === true;
  const [isDbReady, setIsDbReady] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prefilledBarcode, setPrefilledBarcode] = useState<string | undefined>(
    undefined,
  );
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [arqueoModalVisible, setArqueoModalVisible] = useState(false);
  const [barcodeScannerVisible, setBarcodeScannerVisible] = useState(false);
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [refundTransactionId, setRefundTransactionId] = useState<string | null>(
    null,
  );

  const { isOnline, pendingCount, isSyncing, forceSync } = useSyncEngine(
    isDbReady && Boolean(storeId) && cloudSyncEnabled,
  );

  const {
    products,
    loading,
    error: catalogError,
    addProduct,
    editProduct,
    deleteProduct,
    refreshProducts,
  } = useCatalog(storeId, isDbReady && Boolean(storeId));
  const initialSync = useInitialSync(
    storeId ?? "",
    refreshProducts,
    cloudSyncEnabled,
  );

  const { cart, total, totalItems, addToCart, removeFromCart, clearCart } =
    useCart();

  useEffect(() => {
    clearCart();
    setProductModalVisible(false);
    setHistoryModalVisible(false);
    setArqueoModalVisible(false);
    setBarcodeScannerVisible(false);
    setBackupModalVisible(false);
    setRefundTransactionId(null);
    initialSync.closeModal();
  }, [clearCart, initialSync.closeModal, storeId]);

  const initializeDatabase = useCallback(async () => {
    setDatabaseError(null);
    try {
      await initDatabase();
      setIsDbReady(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to initialize the local database.";
      console.error("Error initializing local SQLite DB:", error);
      setDatabaseError(message);
    }
  }, []);

  useEffect(() => {
    void initializeDatabase();
  }, [initializeDatabase]);

  useEffect(() => {
    setCloudSyncEnabled(cloudSyncEnabled);
  }, [cloudSyncEnabled]);

  useEffect(() => {
    if (isDbReady && storeId && cloudSyncEnabled) {
      void initialSync.checkSyncStatus().catch((error) => {
        console.error("[App] Failed to check initial sync status:", error);
      });
    }
  }, [cloudSyncEnabled, initialSync.checkSyncStatus, isDbReady, storeId]);

  const requestSignOut = () => {
    Alert.alert("Cerrar sesión", "¿Quieres cerrar la sesión de esta cuenta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: () => {
          void signOut().catch((error: unknown) => {
            const message =
              error instanceof Error
                ? error.message
                : "No se pudo cerrar la sesión.";
            Alert.alert("Error", message);
          });
        },
      },
    ]);
  };

  // Show authentication and store-resolution failures instead of presenting the wrong onboarding screen.
  if (isAuthLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary[600]} />
        <Text style={styles.loadingText}>Verificando sesión...</Text>
      </View>
    );
  }

  if (authError) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.centerContainer}>
          <Text style={styles.loadingText}>
            No se pudo cargar la cuenta: {authError}
          </Text>
          <Button title="Reintentar" onPress={refreshAuth} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!session) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <AuthScreen />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!storeId) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <CreateStoreScreen
            userId={session.user.id}
            onStoreCreated={refreshAuth}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (databaseError) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.centerContainer}>
          <Text style={styles.loadingText}>
            No se pudo iniciar la base de datos: {databaseError}
          </Text>
          <Button title="Reintentar" onPress={initializeDatabase} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!isDbReady || loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary[600]} />
        <Text style={styles.loadingText}>Cargando base de datos local...</Text>
      </View>
    );
  }

  if (catalogError) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.centerContainer}>
          <Text style={styles.loadingText}>
            No se pudo cargar el catálogo: {catalogError}
          </Text>
          <Button title="Reintentar" onPress={refreshProducts} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />

        <Header
          title={storeName || "Mi tienda"}
          subtitle="Punto de venta"
          onBackupPress={() => setBackupModalVisible(true)}
          onSignOutPress={requestSignOut}
          isOnline={isOnline}
          isCloudSyncEnabled={cloudSyncEnabled}
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
                onEdit={() => {
                  setPrefilledBarcode(undefined);
                  setEditingProduct(item);
                  setProductModalVisible(true);
                }}
              />
            );
          }}
        />

        <BottomNavigation
          onScanPress={() => setBarcodeScannerVisible(true)}
          onHistoryPress={() => setHistoryModalVisible(true)}
          onAddPress={() => {
            setEditingProduct(null);
            setPrefilledBarcode(undefined);
            setProductModalVisible(true);
          }}
          onArqueoPress={() => setArqueoModalVisible(true)}
          onCatalogSyncPress={initialSync.handlePullToRefresh}
          isCloudSyncEnabled={cloudSyncEnabled}
          isCatalogSyncing={
            initialSync.isRefreshing || initialSync.isProcessing
          }
        />

        <CartBar
          totalItems={totalItems}
          totalPrice={total}
          onCheckoutPress={() => setCheckoutModalVisible(true)}
          bottomOffset={88}
        />

        <ProductFormModal
          visible={productModalVisible}
          onClose={() => setProductModalVisible(false)}
          onSave={async (productData) => {
            if (editingProduct) await editProduct(productData);
            else await addProduct(productData);
          }}
          onDelete={async (productId) => {
            removeFromCart(productId);
            await deleteProduct(productId);
          }}
          storeId={storeId}
          initialProduct={editingProduct}
          initialBarcode={prefilledBarcode}
        />

        <CheckoutModal
          visible={checkoutModalVisible}
          onClose={() => setCheckoutModalVisible(false)}
          cart={cart}
          total={total}
          storeId={storeId}
          onRemoveItem={removeFromCart}
          onSuccess={async () => {
            clearCart();
            await refreshProducts();
          }}
        />

        <SalesHistoryModal
          visible={historyModalVisible}
          storeId={storeId}
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
          storeId={storeId}
          onClose={() => setArqueoModalVisible(false)}
        />

        <RefundModal
          visible={refundTransactionId !== null}
          transactionId={refundTransactionId}
          storeId={storeId}
          onClose={() => setRefundTransactionId(null)}
          onRefundSuccess={async () => {
            setRefundTransactionId(null);
            await refreshProducts();
          }}
        />

        <BarcodeScannerModal
          visible={barcodeScannerVisible}
          title="Cobro Rápido en Caja"
          onBarcodeScanned={async (scannedData) => {
            try {
              const match = await getProductByBarcode(scannedData, storeId);
              if (match) {
                if (match.stock_count <= 0) {
                  Alert.alert(
                    "Sin stock",
                    `El producto "${match.title}" no dispone de stock.`,
                  );
                  return;
                }
                addToCart(match);
                setBarcodeScannerVisible(false);
              } else {
                Alert.alert(
                  "No encontrado",
                  `¿Deseas dar de alta el código ${scannedData}?`,
                  [
                    { text: "Cancelar", style: "cancel" },
                    {
                      text: "Crear",
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
            } catch (e) {
              console.error(e);
            }
          }}
          onClose={() => setBarcodeScannerVisible(false)}
        />

        <SyncDecisionModal
          visible={initialSync.modalVisible}
          localCount={initialSync.localCount}
          isLoading={initialSync.isProcessing}
          onOverwriteLocal={initialSync.handleOverwriteLocal}
          onOverwriteRemote={initialSync.handleOverwriteRemote}
          onCancel={initialSync.closeModal}
        />

        <BackupModal
          visible={backupModalVisible}
          storeId={storeId}
          onClose={() => setBackupModalVisible(false)}
          onRestoreComplete={refreshProducts}
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
    paddingBottom: theme.spacing.xxl * 3,
  },
  listContentWithCartBar: {
    paddingBottom: theme.spacing.xxl * 5,
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
