"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Product } from "@proxi-commerce/types";

export interface WebCartItem {
  product: Product;
  quantity: number;
}

export function useWebCart(storeId: string, currentProducts: Product[]) {
  const storageKey = `proxicommerce_cart_${storeId}`;
  const [items, setItems] = useState<WebCartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as WebCartItem[];
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch (e) {
      console.warn("[useWebCart] Failed to load cart from localStorage", e);
    } finally {
      setIsLoaded(true);
    }
  }, [storageKey]);

  // Persist cart to localStorage on changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (e) {
      console.warn("[useWebCart] Failed to save cart to localStorage", e);
    }
  }, [items, isLoaded, storageKey]);

  // Reconcile items when live stock changes
  useEffect(() => {
    if (!isLoaded || currentProducts.length === 0) return;

    setItems((prevItems) => {
      let changed = false;
      const productMap = new Map<string, Product>();
      for (const p of currentProducts) {
        productMap.set(p.id, p);
      }

      const reconciled: WebCartItem[] = [];

      for (const item of prevItems) {
        const liveProduct = productMap.get(item.product.id);
        if (!liveProduct || liveProduct.stock_count <= 0) {
          // Out of stock or deleted: remove from cart
          changed = true;
          continue;
        }

        // Cap quantity to current stock
        const validQuantity = Math.min(item.quantity, liveProduct.stock_count);
        if (
          validQuantity !== item.quantity ||
          liveProduct.price !== item.product.price ||
          liveProduct.stock_count !== item.product.stock_count
        ) {
          changed = true;
          reconciled.push({
            product: liveProduct,
            quantity: validQuantity,
          });
        } else {
          reconciled.push(item);
        }
      }

      return changed ? reconciled : prevItems;
    });
  }, [currentProducts, isLoaded]);

  const addItem = useCallback((product: Product, quantity = 1) => {
    if (product.stock_count <= 0) return;

    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, product.stock_count);
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, product, quantity: newQty } : i,
        );
      } else {
        const initialQty = Math.min(quantity, product.stock_count);
        return [...prev, { product, quantity: initialQty }];
      }
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((i) => i.product.id !== productId);
      }
      return prev.map((i) => {
        if (i.product.id !== productId) return i;
        const capped = Math.min(quantity, i.product.stock_count);
        return { ...i, quantity: capped };
      });
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }, [storageKey]);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [items],
  );

  return {
    items,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    totalItems,
    total,
    isLoaded,
  };
}
