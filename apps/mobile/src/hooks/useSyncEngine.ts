/**
 * @file useSyncEngine.ts
 * @description React Hook that observes network connectivity via `@react-native-community/netinfo`,
 * tracks the local sync queue length, pushes pending mutations upstream to Supabase,
 * and maintains inbound synchronization (WebSockets Realtime + incremental pull) for web orders and stock.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import NetInfo from "@react-native-community/netinfo";
import { triggerUpstreamSync, isSyncServiceActive } from "../services/syncService";
import { getPendingSyncCount } from "../db/syncQueue";
import {
  pullInboundChanges,
  subscribeToStoreInboundEvents,
  InboundSyncResult,
  InboundCallback,
} from "../services/inboundSyncService";

export interface UseSyncEngineReturn {
  /** True if the device currently has active internet connectivity */
  isOnline: boolean;
  /** Number of pending mutations awaiting synchronization in local SQLite */
  pendingCount: number;
  /** True if an active synchronization cycle is currently uploading */
  isSyncing: boolean;
  /** Manually triggers an immediate upstream sync and inbound pull attempt */
  forceSync: () => Promise<void>;
  /** Refreshes the pending mutations counter */
  refreshPendingCount: () => Promise<void>;
}

export function useSyncEngine(
  enabled = true,
  storeId?: string | null,
  onInboundData?: InboundCallback,
): UseSyncEngineReturn {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncingState, setSyncingState] = useState<boolean>(false);
  const onInboundDataRef = useRef<InboundCallback | undefined>(onInboundData);

  useEffect(() => {
    onInboundDataRef.current = onInboundData;
  }, [onInboundData]);

  /**
   * Refreshes the count of pending items stored in SQLite sync_queue.
   */
  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingSyncCount();
    setPendingCount(count);
  }, []);

  /**
   * Triggers upstream sync and subsequent inbound pull, then updates state.
   */
  const runSync = useCallback(async () => {
    setSyncingState(true);
    try {
      await triggerUpstreamSync();

      // After upstream mutations are safely sent, pull inbound changes if store is selected
      if (storeId) {
        const inboundResult = await pullInboundChanges(storeId);
        if (
          inboundResult.newWebOrdersCount > 0 ||
          inboundResult.updatedStockCount > 0
        ) {
          onInboundDataRef.current?.(inboundResult);
        }
      }
    } finally {
      setSyncingState(isSyncServiceActive());
      await refreshPendingCount();
    }
  }, [storeId, refreshPendingCount]);

  // Realtime subscription effect
  useEffect(() => {
    if (!enabled || !storeId || !isOnline) return;

    const unsubscribeRealtime = subscribeToStoreInboundEvents(
      storeId,
      (summary) => {
        if (summary.newWebOrdersCount > 0 || summary.updatedStockCount > 0) {
          onInboundDataRef.current?.(summary);
        }
      },
    );

    // Initial pull when store and sync are enabled
    void pullInboundChanges(storeId).then((res) => {
      if (res.newWebOrdersCount > 0 || res.updatedStockCount > 0) {
        onInboundDataRef.current?.(res);
      }
    });

    // 30s background polling fallback for missed websocket frames
    const fallbackPollInterval = setInterval(() => {
      void pullInboundChanges(storeId).then((res) => {
        if (res.newWebOrdersCount > 0 || res.updatedStockCount > 0) {
          onInboundDataRef.current?.(res);
        }
      });
    }, 30_000);

    return () => {
      unsubscribeRealtime();
      clearInterval(fallbackPollInterval);
    };
  }, [enabled, storeId, isOnline]);

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch of pending mutations
    void refreshPendingCount();

    // Subscribe to network reachability changes
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      const connected = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(connected);

      // Auto-trigger sync when connectivity is restored
      if (connected) {
        runSync();
      }
    });

    // Periodic check to keep pending counter up-to-date
    const interval = setInterval(() => {
      refreshPendingCount();
    }, 5000);

    return () => {
      unsubscribeNet();
      clearInterval(interval);
    };
  }, [enabled, runSync, refreshPendingCount]);

  const forceSync = async () => {
    if (isOnline) {
      await runSync();
    }
  };

  return {
    isOnline,
    pendingCount,
    isSyncing: syncingState,
    forceSync,
    refreshPendingCount,
  };
}
