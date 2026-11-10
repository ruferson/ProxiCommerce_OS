/**
 * @file useCatalog.ts
 * @description Custom hook for managing the product catalog state and local database synchronization.
 * Exposes product records, loading states, and operations to create or update catalog entities.
 */

import { useState, useEffect, useCallback, useRef } from "react";
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
  /** Error from the last catalog read, if any */
  error: string | null;
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
export function useCatalog(
  storeId: string | null,
  enabled = true,
): UseCatalogReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  /**
   * Refetches the full product catalog from the SQLite database.
   */
  const refreshProducts = useCallback(async (): Promise<void> => {
    const currentRequestId = ++requestId.current;
    try {
      setLoading(true);
      setError(null);
      if (!storeId) {
        setProducts([]);
        return;
      }

      const data = await getProducts(storeId);
      if (currentRequestId === requestId.current) setProducts(data);
    } catch (fetchError) {
      if (currentRequestId === requestId.current) {
        console.error("Failed to fetch local product catalog:", fetchError);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load the catalog.",
        );
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, [storeId]);

  // Fetch initial product list when the hook mounts
  useEffect(() => {
    if (enabled && storeId) {
      void refreshProducts();
    } else {
      requestId.current += 1;
      setProducts([]);
      setLoading(false);
      setError(null);
    }
  }, [enabled, refreshProducts, storeId]);

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
    if (!storeId) return;
    await updateProductStock(productId, newStock, storeId);
    await refreshProducts();
  };

  /**
   * Removes a product from the SQLite database and refreshes the catalog state.
   */
  const deleteProduct = async (productId: string): Promise<void> => {
    if (!storeId) return;
    await deleteProductService(productId, storeId);
    await refreshProducts();
  };

  return {
    products,
    loading,
    error,
    addProduct,
    editProduct,
    setStock,
    deleteProduct,
    refreshProducts,
  };
}
