/**
 * @file useSyncEngine.ts
 * @description React Hook that observes network connectivity via `@react-native-community/netinfo`,
 * tracks the local sync queue length, and automatically wakes up the background sync service
 * when the device reconnects to the internet.
 */

import { useEffect, useState, useCallback } from "react";
import NetInfo from "@react-native-community/netinfo";
import { triggerUpstreamSync, isSyncServiceActive } from "../services/syncService";
import { getPendingSyncCount } from "../db/syncQueue";

export interface UseSyncEngineReturn {
  /** True if the device currently has active internet connectivity */
  isOnline: boolean;
  /** Number of pending mutations awaiting synchronization in local SQLite */
  pendingCount: number;
  /** True if an active synchronization cycle is currently uploading */
  isSyncing: boolean;
  /** Manually triggers an immediate upstream sync attempt */
  forceSync: () => Promise<void>;
  /** Refreshes the pending mutations counter */
  refreshPendingCount: () => Promise<void>;
}

export function useSyncEngine(): UseSyncEngineReturn {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncingState, setSyncingState] = useState<boolean>(false);

  /**
   * Refreshes the count of pending items stored in SQLite sync_queue.
   */
  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingSyncCount();
    setPendingCount(count);
  }, []);

  /**
   * Triggers sync and updates state.
   */
  const runSync = useCallback(async () => {
    setSyncingState(true);
    try {
      await triggerUpstreamSync();
    } finally {
      setSyncingState(isSyncServiceActive());
      await refreshPendingCount();
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    // Initial fetch of pending mutations
    refreshPendingCount();

    // Subscribe to network reachability changes
    const unsubscribe = NetInfo.addEventListener((state) => {
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
      unsubscribe();
      clearInterval(interval);
    };
  }, [runSync, refreshPendingCount]);

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
