/**
 * @file manifest.ts
 * @description Dynamic Web App Manifest generator for Next.js App Router.
 * Configures PWA metadata, standalone display properties, and theme colors.
 */

import { MetadataRoute } from "next";

/**
 * Generates the web app manifest route handler (`/manifest.webmanifest`).
 *
 * @returns {MetadataRoute.Manifest} Validated Web Manifest specification object.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ProxiCommerce Storefront",
    short_name: "ProxiCommerce",
    description: "Decentralized local commerce platform for neighborhood retail",
    start_url: "/",
    display: "standalone",
    background_color: "#fdfcf9",
    theme_color: "#4f46e5",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
