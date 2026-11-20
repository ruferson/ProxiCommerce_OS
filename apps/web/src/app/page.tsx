/**
 * @file page.tsx
 * @description Main directory page for ProxiCommerce OS web storefront.
 * Server Component that queries the public stores directory from Supabase
 * and provides responsive filtering and links to individual merchant storefronts.
 */

import React from "react";
import { supabase } from "../lib/supabase";
import { PublicStore } from "@proxi-commerce/types";
import { StoreDirectoryClient } from "../components/storefront/StoreDirectoryClient";

/**
 * Incremental Static Regeneration (ISR) cadence: re-validate cached directory every 10 seconds.
 */
export const revalidate = 10;

/**
 * Root storefront home page server component.
 *
 * @returns {Promise<React.ReactElement>} Rendered store directory page.
 */
export default async function HomePage(): Promise<React.ReactElement> {
  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, slug, name, created_at")
    .order("name", { ascending: true });

  if (error) {
    console.error("[HomePage] Error fetching public stores:", error.message);
  }

  const initialStores: PublicStore[] = (stores as PublicStore[]) || [];

  return (
    <main className="min-h-screen">
      <StoreDirectoryClient initialStores={initialStores} />
    </main>
  );
}
