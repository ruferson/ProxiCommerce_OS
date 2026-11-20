/**
 * @file layout.tsx
 * @description Root layout component for the customer web storefront application.
 * Injects global Tailwind styles, sets HTML lang headers, and initializes the PWA Service Worker.
 */

import React from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistrar } from "../components/ServiceWorkerRegistrar";

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "ProxiCommerce Storefront",
  description: "Plataforma de comercio de proximidad para el pequeño comercio local",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export interface RootLayoutProps {
  children: React.ReactNode;
}

/**
 * Root application wrapper.
 *
 * @param {RootLayoutProps} props - Children components rendered inside the layout.
 * @returns {React.ReactElement} Root HTML shell.
 */
export default function RootLayout({ children }: RootLayoutProps): React.ReactElement {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#fdfcf9] text-stone-900 antialiased">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
