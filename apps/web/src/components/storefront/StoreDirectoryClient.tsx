/**
 * @file StoreDirectoryClient.tsx
 * @description Interactive directory component for browsing and filtering local stores.
 * Provides client-side real-time filtering, responsive store cards, and navigation links.
 */

"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { PublicStore } from "@proxi-commerce/types";

export interface StoreDirectoryClientProps {
  /** Initial array of public store records fetched from Supabase */
  initialStores: PublicStore[];
}

/**
 * Public store directory component.
 *
 * @param {StoreDirectoryClientProps} props - Component properties.
 * @returns {React.ReactElement} Rendered store directory.
 */
export function StoreDirectoryClient({
  initialStores,
}: StoreDirectoryClientProps): React.ReactElement {
  const [search, setSearch] = useState("");

  // Filter stores client-side by name or slug
  const filteredStores = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialStores;
    return initialStores.filter(
      (s) => s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q),
    );
  }, [initialStores, search]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Hero Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-4">
          <span>🏪</span> Red de Comercio Local
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-stone-900 tracking-tight mb-4">
          ProxiCommerce <span className="text-indigo-600">Storefront</span>
        </h1>
        <p className="text-lg text-stone-600 max-w-2xl mx-auto">
          Apoya al comercio de tu barrio. Compra online en panaderías, ferreterías, librerías y comercios locales con recogida en tienda o entrega a domicilio.
        </p>

        {/* Real-time Search Input */}
        <div className="mt-8 max-w-md mx-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar tienda o comercio por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 pl-11 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm text-sm"
            />
            <svg
              className="w-5 h-5 absolute left-3.5 top-3.5 text-stone-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-3.5 text-xs text-stone-400 hover:text-stone-600"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Store Grid or Empty State */}
      {filteredStores.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center max-w-md mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4 text-2xl">
            🏬
          </div>
          <h3 className="text-lg font-bold text-stone-800 mb-2">
            {initialStores.length === 0
              ? "Aún no hay tiendas conectadas"
              : "No se encontraron comercios"}
          </h3>
          <p className="text-sm text-stone-500 mb-6">
            {initialStores.length === 0
              ? "Las tiendas creadas en la app móvil ProxiCommerce POS aparecerán aquí cuando activen la sincronización cloud."
              : `No hay resultados coincidentes con "${search}". Prueba con otro término.`}
          </p>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl text-sm font-semibold hover:bg-stone-200 transition"
            >
              Restablecer búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStores.map((store) => (
            <Link
              key={store.id}
              href={`/store/${store.slug}`}
              className="group block bg-white rounded-3xl border border-stone-200 hover:border-indigo-400 p-6 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 group-hover:bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xl transition-colors">
                  {store.name.charAt(0).toUpperCase()}
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Abierta
                </span>
              </div>
              <h2 className="text-xl font-bold text-stone-900 group-hover:text-indigo-600 transition-colors mb-1">
                {store.name}
              </h2>
              <p className="text-xs text-stone-500 mb-4 font-mono">
                /store/{store.slug}
              </p>
              <div className="flex items-center justify-between pt-4 border-t border-stone-100 text-xs font-semibold text-indigo-600 group-hover:translate-x-1 transition-transform">
                <span>Ver catálogo y comprar</span>
                <span>→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
