/**
 * @file ProductGrid.tsx
 * @description Catalog display grid with instant client-side search, stock availability toggles,
 * and pricing/alphabetical sorting options.
 */

"use client";

import React, { useState, useMemo } from "react";
import { Product } from "@proxi-commerce/types";
import { ProductCard } from "./ProductCard";

export interface ProductGridProps {
  /** Full list of store products */
  products: Product[];
  /** Map of product IDs to their current cart quantity */
  cartItemsMap: Map<string, number>;
  /** Callback to add item to cart */
  onAddToCart: (product: Product) => void;
  /** Callback to update item quantity in cart */
  onUpdateQuantity: (productId: string, quantity: number) => void;
}

export type SortOption = "TITLE_ASC" | "PRICE_ASC" | "PRICE_DESC";

/**
 * Filterable and sortable catalog grid.
 *
 * @param {ProductGridProps} props - Component properties.
 * @returns {React.ReactElement} Catalog toolbar and responsive product cards.
 */
export function ProductGrid({
  products,
  cartItemsMap,
  onAddToCart,
  onUpdateQuantity,
}: ProductGridProps): React.ReactElement {
  const [search, setSearch] = useState("");
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("TITLE_ASC");

  // Apply search query, in-stock filter, and ordering in memory
  const filteredAndSortedProducts = useMemo(() => {
    let result = products;

    // 1. Text filter (matches product title and EAN barcode)
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)),
      );
    }

    // 2. Stock filter
    if (onlyInStock) {
      result = result.filter((p) => p.stock_count > 0);
    }

    // 3. Sorting
    return [...result].sort((a, b) => {
      if (sortOption === "PRICE_ASC") return a.price - b.price;
      if (sortOption === "PRICE_DESC") return b.price - a.price;
      return a.title.localeCompare(b.title, "es", { sensitivity: "base" });
    });
  }, [products, search, onlyInStock, sortOption]);

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-sm flex flex-col sm:flex-row gap-3.5 items-stretch sm:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar por producto o código de barras..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 pl-10 rounded-2xl border border-stone-300 bg-stone-50 text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
          />
          <svg
            className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-3 text-xs text-stone-400 hover:text-stone-600"
              aria-label="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters & Sorting */}
        <div className="flex items-center gap-3 justify-between sm:justify-end">
          {/* In stock toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-stone-700">
            <input
              type="checkbox"
              checked={onlyInStock}
              onChange={(e) => setOnlyInStock(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-stone-300"
            />
            <span>Solo en stock</span>
          </label>

          {/* Sort dropdown */}
          <div className="flex items-center gap-1.5">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              aria-label="Ordenar productos"
              className="px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 text-stone-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="TITLE_ASC">Nombre (A-Z)</option>
              <option value="PRICE_ASC">Precio: menor a mayor</option>
              <option value="PRICE_DESC">Precio: mayor a menor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid or Empty State */}
      {filteredAndSortedProducts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-3 text-2xl">
            🔍
          </div>
          <h4 className="text-lg font-bold text-stone-800 mb-1">
            No se encontraron productos
          </h4>
          <p className="text-sm text-stone-500 max-w-sm mx-auto mb-4">
            No hay artículos que coincidan con los filtros seleccionados.
          </p>
          {(search || onlyInStock) && (
            <button
              onClick={() => {
                setSearch("");
                setOnlyInStock(false);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredAndSortedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              quantityInCart={cartItemsMap.get(product.id) || 0}
              onAddToCart={onAddToCart}
              onUpdateQuantity={onUpdateQuantity}
            />
          ))}
        </div>
      )}
    </div>
  );
}
