/**
 * @file useAuth.ts
 * @description Tracks the Supabase session and resolves the authenticated merchant's store.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export interface AuthState {
  session: Session | null;
  storeId: string | null;
  storeName: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const storeRequestId = useRef(0);
  const authEventId = useRef(0);

  const fetchUserStore = useCallback(async (userId: string) => {
    const requestId = ++storeRequestId.current;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from("stores")
        .select("id, name")
        .eq("owner_auth_id", userId)
        .maybeSingle();

      if (queryError) throw queryError;
      if (requestId === storeRequestId.current) {
        setStoreId(data?.id ?? null);
        setStoreName(data?.name ?? null);
      }
    } catch (fetchError) {
      if (requestId === storeRequestId.current) {
        const message =
          fetchError instanceof Error ? fetchError.message : "Unable to load the store.";
        console.error("[useAuth] Error fetching store:", fetchError);
        setError(message);
      }
    } finally {
      if (requestId === storeRequestId.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    const requestEventId = authEventId.current;
    setIsLoading(true);
    setError(null);

    try {
      const {
        data: { session: currentSession },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (requestEventId !== authEventId.current) return;

      setSession(currentSession);
      if (currentSession) {
        await fetchUserStore(currentSession.user.id);
      } else {
        setStoreId(null);
        setStoreName(null);
        setIsLoading(false);
      }
    } catch (refreshError) {
      if (requestEventId !== authEventId.current) return;
      const message =
        refreshError instanceof Error
          ? refreshError.message
          : "Unable to restore the authentication session.";
      console.error("[useAuth] Error restoring session:", refreshError);
      setError(message);
      setIsLoading(false);
    }
  }, [fetchUserStore]);

  const signOut = useCallback(async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initialAuthEventId = authEventId.current;

    void supabase.auth
      .getSession()
      .then(({ data: { session: currentSession }, error: sessionError }) => {
        if (!isMounted || authEventId.current !== initialAuthEventId) return;
        if (sessionError) throw sessionError;

        setSession(currentSession);
        if (currentSession) {
          void fetchUserStore(currentSession.user.id);
        } else {
          setIsLoading(false);
        }
      })
      .catch((sessionError: unknown) => {
        if (!isMounted || authEventId.current !== initialAuthEventId) return;
        const message =
          sessionError instanceof Error
            ? sessionError.message
            : "Unable to restore the authentication session.";
        console.error("[useAuth] Error loading session:", sessionError);
        setError(message);
        setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      authEventId.current += 1;
      const currentEventId = authEventId.current;
      storeRequestId.current += 1;
      setSession(currentSession);
      setStoreId(null);
      setStoreName(null);
      setError(null);

      if (currentSession) {
        void Promise.resolve().then(() => {
          if (currentEventId === authEventId.current) {
            return fetchUserStore(currentSession.user.id);
          }
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      storeRequestId.current += 1;
      subscription.unsubscribe();
    };
  }, [fetchUserStore]);

  return { session, storeId, storeName, isLoading, error, refresh, signOut };
}
