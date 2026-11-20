/**
 * @file StoreHeader.tsx
 * @description Fixed sticky navigation bar for the customer storefront.
 * Displays store brand title, verification badge, link to store directory,
 * and shopping cart trigger with badge counters and accumulated totals.
 */

"use client";

import React from "react";
import Link from "next/link";
import { PublicStore } from "@proxi-commerce/types";

export interface StoreHeaderProps {
  /** Active public store entity */
  store: PublicStore;
  /** Total units currently in the cart */
  totalItems: number;
  /** Accumulated total monetary value in Euros */
  totalAmount: number;
  /** Callback to trigger cart drawer presentation */
  onOpenCart: () => void;
}

/**
 * Storefront header navigation component.
 *
 * @param {StoreHeaderProps} props - Component properties.
 * @returns {React.ReactElement} Sticky top header.
 */
export function StoreHeader({
  store,
  totalItems,
  totalAmount,
  onOpenCart,
}: StoreHeaderProps): React.ReactElement {
  const formattedTotal = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(totalAmount);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
        {/* Left: Back Link & Store Details */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-10 h-10 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors"
            title="Volver a todas las tiendas"
          >
            ←
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-extrabold text-stone-900 leading-tight">
                {store.name}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span>✓</span> Verificada
              </span>
            </div>
            <p className="text-xs text-stone-500 font-mono">
              /store/{store.slug}
            </p>
          </div>
        </div>

        {/* Right: Cart Button */}
        <button
          onClick={onOpenCart}
          className="relative inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm transition-all active:scale-95"
          aria-label="Abrir carrito de compras"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span className="hidden sm:inline">Carrito</span>
          {totalItems > 0 && (
            <span className="font-bold">
              · {formattedTotal}
            </span>
          )}
          {totalItems > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              {totalItems}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
