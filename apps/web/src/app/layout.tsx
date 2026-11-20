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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#fdfcf9] text-stone-900 antialiased">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
