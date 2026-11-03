import { useState, useCallback, useMemo } from "react";
import { Product, CartItem } from "@proxi-commerce/types";

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
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = useCallback((product: Product) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) => item.product.id === product.id,
      );

      if (existingIndex > -1) {
        const currentItem = prevCart[existingIndex];
        if (currentItem.quantity >= product.stock_count) {
          return prevCart; // Prevent exceeding available stock
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

      if (product.stock_count < 1) return prevCart;

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

  const removeFromCart = useCallback((productId: string) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) => item.product.id === productId,
      );
      if (existingIndex === -1) return prevCart;

      const currentItem = prevCart[existingIndex];
      if (currentItem.quantity > 1) {
        const updated = [...prevCart];
        const newQuantity = currentItem.quantity - 1;
        updated[existingIndex] = {
          ...currentItem,
          quantity: newQuantity,
          subtotal: newQuantity * currentItem.product.price,
        };
        return updated;
      }

      return prevCart.filter((item) => item.product.id !== productId);
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setCart((prevCart) => {
      if (quantity <= 0) {
        return prevCart.filter((item) => item.product.id !== productId);
      }

      return prevCart.map((item) => {
        if (item.product.id === productId) {
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

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

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
