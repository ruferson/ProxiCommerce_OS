import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { initDatabase } from "./src/db/schema";
import { useCatalog } from "./src/hooks/useCatalog";
import { Header } from "./src/components/layout/Header";
import { ProductCard } from "./src/components/catalog/ProductCard";
import { AddProductModal } from "./src/components/catalog/AddProductModal";
import { theme } from "./src/theme";
import { StatusBar } from "expo-status-bar";

const DEMO_STORE_ID = "store_local_001";

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const { products, loading, addProduct, setStock } = useCatalog();

  useEffect(() => {
    initDatabase()
      .then(() => setIsDbReady(true))
      .catch((err) =>
        console.error("Error initializing local SQLite DB:", err),
      );
  }, []);

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
          onAddPress={() => setModalVisible(true)}
        />

        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Sin productos registrados</Text>
              <Text style={styles.emptySubtext}>
                Añade el primer producto utilizando el botón "+ Nuevo".
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ProductCard product={item} onUpdateStock={setStock} />
          )}
        />

        <AddProductModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSave={addProduct}
          storeId={DEMO_STORE_ID}
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
