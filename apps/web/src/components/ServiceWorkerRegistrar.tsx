/**
 * @file ServiceWorkerRegistrar.tsx
 * @description Client-side lifecycle component that registers the progressive web app (PWA)
 * service worker on initial page mount.
 */

"use client";

import { useEffect } from "react";

/**
 * Service worker registration component.
 * Executes on client mount and remains invisible in the DOM tree.
 *
 * @returns {null} Renders no visual elements.
 */
export function ServiceWorkerRegistrar(): null {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA] Service Worker registered with scope:", registration.scope);
        })
        .catch((error) => {
          console.warn("[PWA] Service Worker registration failed:", error);
        });
    }
  }, []);

  return null;
}
