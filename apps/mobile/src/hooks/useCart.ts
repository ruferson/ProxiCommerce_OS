/**
 * @file useCart.ts
 * @description In-memory Point-of-Sale (POS) shopping cart state management hook.
 * Handles adding/removing items, updating quantities with stock validation, and calculating order totals.
 */

import { useState, useCallback, useMemo } from "react";
import { Product, CartItem } from "@proxi-commerce/types";

/**
 * Return type definition for the `useCart` hook.
 */
export interface UseCartReturn {
  /** Array of active cart items */
  cart: CartItem[];
  /** Total price sum in Euros */
  total: number;
  /** Total count of individual physical items in cart */
  totalItems: number;
  /** Adds a product to cart or increments quantity if stock permits */
  addToCart: (product: Product) => void;
  /** Decrements item quantity or removes it completely when reaching zero */
  removeFromCart: (productId: string) => void;
  /** Manually sets exact item quantity in cart */
  updateQuantity: (productId: string, quantity: number) => void;
  /** Empties all items from the active cart */
  clearCart: () => void;
}

/**
 * Custom hook providing memory state management for the active POS shopping cart.
 *
 * @returns {UseCartReturn} Cart state and mutation methods.
 */
export function useCart(): UseCartReturn {
  // In-memory list of cart items
  const [cart, setCart] = useState<CartItem[]>([]);

  /**
   * Adds one unit of a product to the cart. If the product is already present,
   * its quantity is incremented as long as available stock is not exceeded.
   */
  const addToCart = useCallback((product: Product) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) => item.product.id === product.id,
      );

      // Product already exists in cart: increment quantity if within available inventory
      if (existingIndex > -1) {
        const currentItem = prevCart[existingIndex];
        if (currentItem.quantity >= product.stock_count) {
          // Prevent exceeding available stock
          return prevCart;
        }

        const updated = [...prevCart];
        const newQuantity = currentItem.quantity + 1;
        updated[existingIndex] = {
          ...currentItem,
          quantity: newQuantity,
          subtotal: newQuantity * product.price,
        };
        return updated;
      }

      // Check if product is out of stock before adding first unit
      if (product.stock_count < 1) return prevCart;

      // Add as a new entry in cart
      return [
        ...prevCart,
        {
          product,
          quantity: 1,
          subtotal: product.price,
        },
      ];
    });
  }, []);

  /**
   * Decrements the quantity of a product in the cart by 1.
   * If the quantity reaches 0, the item is completely removed from the cart.
   */
  const removeFromCart = useCallback((productId: string) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) => item.product.id === productId,
      );
      if (existingIndex === -1) return prevCart;

      const currentItem = prevCart[existingIndex];
      if (currentItem.quantity > 1) {
        // Decrement quantity and recalculate line subtotal
        const updated = [...prevCart];
        const newQuantity = currentItem.quantity - 1;
        updated[existingIndex] = {
          ...currentItem,
          quantity: newQuantity,
          subtotal: newQuantity * currentItem.product.price,
        };
        return updated;
      }

      // Remove item completely when reducing past 1
      return prevCart.filter((item) => item.product.id !== productId);
    });
  }, []);

  /**
   * Updates an item's quantity to a specified absolute value, clamping to available stock.
   * Passing a non-positive value removes the item.
   */
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setCart((prevCart) => {
      // If requested quantity is 0 or negative, remove the item
      if (quantity <= 0) {
        return prevCart.filter((item) => item.product.id !== productId);
      }

      return prevCart.map((item) => {
        if (item.product.id === productId) {
          // Ensure quantity does not exceed product's stock count
          const validQuantity = Math.min(quantity, item.product.stock_count);
          return {
            ...item,
            quantity: validQuantity,
            subtotal: validQuantity * item.product.price,
          };
        }
        return item;
      });
    });
  }, []);

  /**
   * Clears all items from the current cart session.
   */
  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Compute total monetary cost of all items in cart
  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  // Compute total count of physical items currently in cart
  const totalItems = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  return {
    cart,
    total,
    totalItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };
}

