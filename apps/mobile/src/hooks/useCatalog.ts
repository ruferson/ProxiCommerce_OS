/**
 * @file useCatalog.ts
 * @description Custom hook for managing the product catalog state and local database synchronization.
 * Exposes product records, loading states, and operations to create or update catalog entities.
 */

import { useState, useEffect, useCallback } from "react";
import { Product } from "@proxi-commerce/types";
import {
  getProducts,
  createProduct,
  updateProductStock,
  updateProductDetails,
  deleteProduct as deleteProductService,
} from "../services/catalogService";

/**
 * Return type definition for the `useCatalog` hook.
 */
export interface UseCatalogReturn {
  /** Array of products fetched from local SQLite storage */
  products: Product[];
  /** Loading state indicator for catalog queries */
  loading: boolean;
  /** Adds a new product entity and triggers catalog refresh */
  addProduct: (
    productData: Omit<Product, "created_at" | "updated_at">,
  ) => Promise<void>;
  /** Edits an existing product entity and triggers catalog refresh */
  editProduct: (
    productData: Omit<Product, "created_at" | "updated_at">,
  ) => Promise<void>;
  /** Updates stock quantity for a specific product and triggers catalog refresh */
  setStock: (productId: string, newStock: number) => Promise<void>;
  /** Removes a product entity by its identifier and triggers catalog refresh */
  deleteProduct: (productId: string) => Promise<void>;
  /** Manually re-fetches product list from local database */
  refreshProducts: () => Promise<void>;
}

/**
 * Custom hook providing state management and CRUD operations for the local POS product catalog.
 *
 * @returns {UseCatalogReturn} Catalog state and mutation functions.
 */
export function useCatalog(enabled = true): UseCatalogReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  /**
   * Refetches the full product catalog from the SQLite database.
   */
  const refreshProducts = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error("Failed to fetch local product catalog:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch initial product list when the hook mounts
  useEffect(() => {
    if (enabled) {
      void refreshProducts();
    }
  }, [enabled, refreshProducts]);

  /**
   * Creates a new product in the SQLite database and refreshes the catalog state.
   */
  const addProduct = async (
    productData: Omit<Product, "created_at" | "updated_at">,
  ): Promise<void> => {
    await createProduct(productData);
    await refreshProducts();
  };

  /**
   * Updates an existing product's details and refreshes the catalog state.
   */
  const editProduct = async (
    productData: Omit<Product, "created_at" | "updated_at">,
  ): Promise<void> => {
    await updateProductDetails(productData);
    await refreshProducts();
  };

  /**
   * Adjusts the stock quantity of a specific product and refreshes the catalog state.
   */
  const setStock = async (
    productId: string,
    newStock: number,
  ): Promise<void> => {
    await updateProductStock(productId, newStock);
    await refreshProducts();
  };

  /**
   * Removes a product from the SQLite database and refreshes the catalog state.
   */
  const deleteProduct = async (productId: string): Promise<void> => {
    await deleteProductService(productId);
    await refreshProducts();
  };

  return {
    products,
    loading,
    addProduct,
    editProduct,
    setStock,
    deleteProduct,
    refreshProducts,
  };
}
