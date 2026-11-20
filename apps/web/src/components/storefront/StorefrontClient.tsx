"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PublicStore, Product, CreateWebOrderResult } from "@proxi-commerce/types";
import { supabase } from "../../lib/supabase";
import { StoreHeader } from "./StoreHeader";
import { ProductGrid } from "./ProductGrid";
import { CartDrawer } from "./CartDrawer";
import { OrderConfirmation } from "./OrderConfirmation";
import { useWebCart } from "./useWebCart";

interface StorefrontClientProps {
  store: PublicStore;
  initialProducts: Product[];
}

export function StorefrontClient({
  store,
  initialProducts,
}: StorefrontClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<CreateWebOrderResult | null>(null);

  // Cart hook bound to this store
  const {
    items,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    totalItems,
    total,
  } = useWebCart(store.id, products);

  // Map of productId -> quantityInCart for fast lookup
  const cartItemsMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.product.id, item.quantity);
    }
    return map;
  }, [items]);

  // Realtime subscription for live stock synchronization
  useEffect(() => {
    const channelName = `web_store_${store.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "products",
          filter: `store_id=eq.${store.id}`,
        },
        (payload) => {
          const updated = payload.new as Product;
          if (updated && updated.id) {
            setProducts((prev) =>
              prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
            );
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "products",
          filter: `store_id=eq.${store.id}`,
        },
        (payload) => {
          const inserted = payload.new as Product;
          if (inserted && inserted.id) {
            setProducts((prev) => {
              if (prev.some((p) => p.id === inserted.id)) return prev;
              return [...prev, inserted];
            });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "products",
          filter: `store_id=eq.${store.id}`,
        },
        (payload) => {
          const old = payload.old as { id: string };
          if (old?.id) {
            setProducts((prev) => prev.filter((p) => p.id !== old.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [store.id]);

  const handleOrderSuccess = (result: CreateWebOrderResult) => {
    setIsCartOpen(false);
    setCompletedOrder(result);
  };

  return (
    <div className="min-h-screen bg-[#fdfcf9] flex flex-col">
      {/* Sticky Top Header */}
      <StoreHeader
        store={store}
        totalItems={totalItems}
        totalAmount={total}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Main Catalog Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <ProductGrid
          products={products}
          cartItemsMap={cartItemsMap}
          onAddToCart={addItem}
          onUpdateQuantity={updateQuantity}
        />
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-200 bg-white py-6 text-center text-xs text-stone-500">
        <p>
          Escaparate público impulsado por{" "}
          <strong className="text-stone-700">ProxiCommerce OS</strong> · Tienda local descentralizada
        </p>
      </footer>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        store={store}
        items={items}
        total={total}
        totalItems={totalItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onClearCart={clearCart}
        onOrderSuccess={handleOrderSuccess}
      />

      {/* Order Confirmation Modal */}
      {completedOrder && (
        <OrderConfirmation
          order={completedOrder}
          storeName={store.name}
          onClose={() => setCompletedOrder(null)}
        />
      )}
    </div>
  );
}
