import { useState, useEffect, useCallback } from "react";
import { Product } from "@proxi-commerce/types";
import {
  getProducts,
  createProduct,
  updateProductStock,
} from "../services/catalogService";

export interface UseCatalogReturn {
  /** Array of products fetched from local SQLite storage */
  products: Product[];
  /** Loading state indicator for catalog queries */
  loading: boolean;
  /** Adds a new product entity and triggers catalog refresh */
  addProduct: (
    productData: Omit<Product, "created_at" | "updated_at">,
  ) => Promise<void>;
  /** Updates stock quantity for a specific product and triggers catalog refresh */
  setStock: (productId: string, newStock: number) => Promise<void>;
  /** Manually re-fetches product list from local database */
  refreshProducts: () => Promise<void>;
}

/**
 * Custom hook providing state management and CRUD operations for the local POS product catalog.
 *
 * @returns {UseCatalogReturn} Catalog state and mutation functions.
 */
export function useCatalog(): UseCatalogReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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

  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  const addProduct = async (
    productData: Omit<Product, "created_at" | "updated_at">,
  ): Promise<void> => {
    await createProduct(productData);
    await refreshProducts();
  };

  const setStock = async (
    productId: string,
    newStock: number,
  ): Promise<void> => {
    await updateProductStock(productId, newStock);
    await refreshProducts();
  };

  return {
    products,
    loading,
    addProduct,
    setStock,
    refreshProducts,
  };
}
