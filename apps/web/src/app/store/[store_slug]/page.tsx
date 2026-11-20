/**
 * @file page.tsx
 * @description Dynamic merchant storefront page for `/store/[store_slug]`.
 * Server Component implementing Next.js 15 asynchronous route params resolution,
 * dynamic metadata generation, and initial server-side product catalog queries.
 */

import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { supabase } from "../../../lib/supabase";
import { PublicStore, Product } from "@proxi-commerce/types";
import { StorefrontClient } from "../../../components/storefront/StorefrontClient";

export interface StorePageProps {
  params: Promise<{
    store_slug: string;
  }>;
}

/**
 * Incremental Static Regeneration (ISR) cadence: re-validate cached storefront every 10 seconds.
 */
export const revalidate = 10;

/**
 * Dynamically generates search-engine and social-media metadata for the storefront.
 *
 * @param {StorePageProps} props - Route parameters containing the merchant store slug.
 * @returns {Promise<Metadata>} Next.js metadata definition.
 */
export async function generateMetadata({
  params,
}: StorePageProps): Promise<Metadata> {
  const { store_slug } = await params;

  const { data: store } = await supabase
    .from("stores")
    .select("name, slug")
    .eq("slug", store_slug)
    .maybeSingle();

  if (!store) {
    return {
      title: "Comercio no encontrado - ProxiCommerce",
    };
  }

  return {
    title: `${store.name} - Escaparate Online | ProxiCommerce`,
    description: `Catálogo de productos y compra online con recogida en tienda o entrega a domicilio en ${store.name}.`,
  };
}

/**
 * Main store route server component.
 *
 * @param {StorePageProps} props - Route parameters.
 * @returns {Promise<React.ReactElement>} Rendered storefront client application.
 */
export default async function StorePage({
  params,
}: StorePageProps): Promise<React.ReactElement> {
  const { store_slug } = await params;

  // 1. Fetch store profile from public view by unique slug
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, slug, name, created_at")
    .eq("slug", store_slug)
    .maybeSingle();

  if (storeError || !store) {
    notFound();
  }

  // 2. Fetch initial active products published by this store
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, store_id, title, price, stock_count, image_uri, barcode, created_at, updated_at")
    .eq("store_id", store.id)
    .order("title", { ascending: true });

  if (productsError) {
    console.error("[StorePage] Error fetching products for store:", productsError.message);
  }

  const initialProducts: Product[] = (products as Product[]) || [];
  const publicStore: PublicStore = store as PublicStore;

  return (
    <StorefrontClient
      store={publicStore}
      initialProducts={initialProducts}
    />
  );
}
