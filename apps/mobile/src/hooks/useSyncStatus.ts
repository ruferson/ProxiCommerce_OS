/**
 * @file useSyncStatus.ts
 * @description React hook that monitors the local SQLite sync queue status, tracks
 * pending operational count, and automatically triggers background queue processing
 * when network connectivity is established or restored.
 */

import { useState, useEffect, useCallback } from "react";
import * as SQLite from "expo-sqlite";
import * as Network from "expo-network";
import { DB_NAME } from "../db/schema";
import { processSyncQueue } from "../services/syncWorker";

/**
 * Reactive state snapshot exposed by `useSyncStatus`.
 */
export interface SyncStatusResult {
  /** Number of operations currently waiting in status 'PENDING' */
  pendingCount: number;
  /** True if the background worker is currently dispatching operations */
  isSyncing: boolean;
  /** True if device has active internet access */
  isOnline: boolean;
  /** ISO timestamp of the last successful queue flush */
  lastSyncedAt: string | null;
  /** Manually triggers a queue sync execution */
  triggerSync: () => Promise<void>;
}

/**
 * Hook for subscribing to offline sync status and automatic network event dispatching.
 *
 * @returns {SyncStatusResult} Current sync state metrics and manual trigger function.
 */
export function useSyncStatus(): SyncStatusResult {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  /**
   * Queries SQLite for the total number of PENDING operations in sync_queue.
   */
  const checkPendingCount = useCallback(async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      const result = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'PENDING';`,
      );
      setPendingCount(result?.count ?? 0);
    } catch (err) {
      console.error("[useSyncStatus] Error counting pending sync items:", err);
    }
  }, []);

  /**
   * Triggers the worker execution and updates internal execution state.
   */
  const triggerSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const processed = await processSyncQueue();
      if (processed) {
        setLastSyncedAt(new Date().toISOString());
      }
    } finally {
      setIsSyncing(false);
      await checkPendingCount();
    }
  }, [checkPendingCount]);

  // --- Initial setup & network polling listener ---
  useEffect(() => {
    let isMounted = true;

    const checkNetworkAndSync = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        const connected = Boolean(
          state.isConnected && state.isInternetReachable,
        );

        if (isMounted) {
          setIsOnline(connected);
        }

        // Auto-trigger sync if connection is active and items are pending
        if (connected) {
          await triggerSync();
        } else {
          await checkPendingCount();
        }
      } catch (err) {
        console.error("[useSyncStatus] Error checking network status:", err);
      }
    };

    // Run check on mount
    checkNetworkAndSync();

    // Poll every 15 seconds to handle network state transitions gracefully
    const intervalId = setInterval(() => {
      if (isMounted) {
        checkNetworkAndSync();
      }
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [triggerSync, checkPendingCount]);

  return {
    pendingCount,
    isSyncing,
    isOnline,
    lastSyncedAt,
    triggerSync,
  };
}
