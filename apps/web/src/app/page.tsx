import React from "react";
import { supabase } from "../lib/supabase";
import { PublicStore } from "@proxi-commerce/types";
import { StoreDirectoryClient } from "../components/storefront/StoreDirectoryClient";

export const revalidate = 10; // Incremental static regeneration every 10 seconds

export default async function HomePage() {
  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, slug, name, created_at")
    .order("name", { ascending: true });

  if (error) {
    console.error("[HomePage] Error fetching stores:", error.message);
  }

  const initialStores: PublicStore[] = (stores as PublicStore[]) || [];

  return (
    <main className="min-h-screen">
      <StoreDirectoryClient initialStores={initialStores} />
    </main>
  );
}
