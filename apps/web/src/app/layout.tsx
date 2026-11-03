import React from "react";

export const metadata = {
  title: "ProxiCommerce Storefront",
  description: "Tienda local descentralizada",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
