/**
 * @file ProductCard.tsx
 * @description Catalog item card presentation component for the web storefront.
 * Handles remote image loading with graceful local fallback, EUR price formatting,
 * live stock indicators (Available, Low Stock, Sold Out), and stepper quantity controls.
 */

"use client";

import React, { useState } from "react";
import { Product } from "@proxi-commerce/types";

export interface ProductCardProps {
  /** Catalog product entity */
  product: Product;
  /** Units of this product currently held in the user's cart */
  quantityInCart: number;
  /** Callback to add product to the cart */
  onAddToCart: (product: Product) => void;
  /** Callback to increment/decrement cart quantity */
  onUpdateQuantity: (productId: string, quantity: number) => void;
}

/**
 * Storefront product card.
 *
 * @param {ProductCardProps} props - Component properties.
 * @returns {React.ReactElement} Interactive product card.
 */
export function ProductCard({
  product,
  quantityInCart,
  onAddToCart,
  onUpdateQuantity,
}: ProductCardProps): React.ReactElement {
  const [imgError, setImgError] = useState(false);

  // Determine if image URI is a valid remote URL and has not failed loading
  const isRemoteImage =
    Boolean(product.image_uri) &&
    (product.image_uri.startsWith("http://") || product.image_uri.startsWith("https://")) &&
    !imgError;

  const isOutOfStock = product.stock_count <= 0;
  const isLowStock = product.stock_count > 0 && product.stock_count <= 3;

  const formattedPrice = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(product.price);

  return (
    <div
      className={`flex flex-col bg-white rounded-3xl border ${
        isOutOfStock
          ? "border-stone-200 opacity-75"
          : "border-stone-200 hover:border-indigo-300"
      } p-4 shadow-sm transition-all duration-200`}
    >
      {/* Product Image Box */}
      <div className="relative w-full h-48 rounded-2xl bg-stone-100 overflow-hidden mb-3.5 flex items-center justify-center">
        {isRemoteImage ? (
          <img
            src={product.image_uri}
            alt={product.title}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-stone-400 gap-1.5 p-4 text-center">
            <span className="text-3xl">📦</span>
            <span className="text-[11px] font-medium text-stone-400">Sin foto remota</span>
          </div>
        )}

        {/* Stock Badge Overlay */}
        <div className="absolute top-2.5 left-2.5">
          {isOutOfStock ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
              Agotado
            </span>
          ) : isLowStock ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              ¡Últimas {product.stock_count} uds.!
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Disponible ({product.stock_count} uds.)
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <h3 className="font-bold text-stone-900 text-base leading-snug mb-1 line-clamp-2">
          {product.title}
        </h3>
        {product.barcode && (
          <p className="text-[11px] text-stone-400 font-mono mb-2">
            EAN: {product.barcode}
          </p>
        )}

        {/* Price & Action Row */}
        <div className="mt-auto pt-3 flex items-center justify-between gap-2 border-t border-stone-100">
          <div>
            <span className="text-xs text-stone-500 block">Precio</span>
            <span className="text-lg font-black text-stone-900 tracking-tight">
              {formattedPrice}
            </span>
          </div>

          {isOutOfStock ? (
            <button
              disabled
              className="px-3.5 py-2 rounded-xl bg-stone-100 text-stone-400 text-xs font-bold cursor-not-allowed"
            >
              No disponible
            </button>
          ) : quantityInCart === 0 ? (
            <button
              onClick={() => onAddToCart(product)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
            >
              Añadir
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-xl p-1">
              <button
                onClick={() => onUpdateQuantity(product.id, quantityInCart - 1)}
                className="w-7 h-7 rounded-lg bg-white text-indigo-700 hover:bg-indigo-100 font-bold flex items-center justify-center transition-colors shadow-xs text-sm"
                aria-label="Disminuir cantidad"
              >
                −
              </button>
              <span className="w-6 text-center text-xs font-black text-indigo-900">
                {quantityInCart}
              </span>
              <button
                onClick={() => onUpdateQuantity(product.id, quantityInCart + 1)}
                disabled={quantityInCart >= product.stock_count}
                className={`w-7 h-7 rounded-lg ${
                  quantityInCart >= product.stock_count
                    ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                    : "bg-white text-indigo-700 hover:bg-indigo-100 font-bold shadow-xs"
                } flex items-center justify-center transition-colors text-sm`}
                aria-label="Aumentar cantidad"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
