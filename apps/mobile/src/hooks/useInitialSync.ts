/**
 * @file useInitialSync.ts
 * @description React hook managing startup synchronization logic and manual pull-to-refresh execution.
 */

import { useState, useCallback } from "react";
import { Alert } from "react-native";
import * as Network from "expo-network";
import * as SQLite from "expo-sqlite";
import { DB_NAME } from "../db/schema";
import {
  overwriteLocalWithRemote,
  overwriteRemoteWithLocal,
} from "../services/pullSyncService";

export function useInitialSync(
  storeId: string,
  onSyncComplete?: () => void | Promise<void>,
  enabled = true,
) {
  const [modalVisible, setModalVisible] = useState(false);
  const [localCount, setLocalCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Checks network and local product count before prompting user
  const checkSyncStatus = useCallback(async (showConfigurationError = false) => {
    if (!enabled) return;

    if (
      !process.env.EXPO_PUBLIC_SUPABASE_URL ||
      !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    ) {
      if (showConfigurationError) {
        Alert.alert(
          "Sincronización no disponible",
          "Configura las credenciales de Supabase para sincronizar el catálogo.",
        );
      }
      return;
    }

    const net = await Network.getNetworkStateAsync();
    if (!net.isConnected || net.isInternetReachable === false) {
      return;
    }

    const db = await SQLite.openDatabaseAsync(DB_NAME);
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM products WHERE store_id = ?;`,
      [storeId],
    );

    const count = row?.count ?? 0;
    setLocalCount(count);

    // If local database is empty or user manually triggered refresh, open prompt modal
    setModalVisible(true);
  }, [enabled, storeId]);

  const handleOverwriteLocal = useCallback(async () => {
    if (!enabled) return;

    try {
      setIsProcessing(true);
      await overwriteLocalWithRemote(storeId);
      setModalVisible(false);
      await onSyncComplete?.();
    } catch (error) {
      console.error("[useInitialSync] Error downloading remote data:", error);
      Alert.alert(
        "Error de sincronización",
        "No se pudieron descargar los productos desde la nube.",
      );
    } finally {
      setIsProcessing(false);
    }
  }, [enabled, onSyncComplete, storeId]);

  const overwriteRemote = useCallback(async () => {
    if (!enabled) return;

    try {
      setIsProcessing(true);
      await overwriteRemoteWithLocal(storeId);
      setModalVisible(false);
      await onSyncComplete?.();
    } catch (error) {
      console.error("[useInitialSync] Error pushing local data to remote:", error);
      Alert.alert(
        "Error de sincronización",
        "No se pudieron subir los productos locales a la nube.",
      );
    } finally {
      setIsProcessing(false);
    }
  }, [enabled, onSyncComplete, storeId]);

  const handleOverwriteRemote = useCallback(() => {
    if (!enabled) return;

    Alert.alert(
      "Reemplazar catálogo en la nube",
      localCount === 0
        ? "El catálogo local está vacío. Si continúas, se eliminarán todos los productos de esta tienda en la nube."
        : "Se subirán los productos locales y se eliminarán de la nube los productos de esta tienda que no existan localmente.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar y continuar",
          style: "destructive",
          onPress: () => {
            void overwriteRemote();
          },
        },
      ],
    );
  }, [enabled, localCount, overwriteRemote]);

  const handlePullToRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await checkSyncStatus(true);
    } catch (error) {
      console.error("[useInitialSync] Error checking sync status:", error);
      Alert.alert(
        "Error de sincronización",
        "No se pudo comprobar el estado de sincronización.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [checkSyncStatus]);

  const closeModal = useCallback(() => setModalVisible(false), []);

  return {
    modalVisible,
    localCount,
    isProcessing,
    isRefreshing,
    checkSyncStatus,
    handleOverwriteLocal,
    handleOverwriteRemote,
    handlePullToRefresh,
    closeModal,
  };
}
