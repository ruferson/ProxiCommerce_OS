/**
 * @file loading.tsx
 * @description Next.js streaming loading skeleton for individual store pages.
 * Displays animated placeholder skeletons while store metadata and initial products are fetched.
 */

import React from "react";

/**
 * Loading skeleton component for `/store/[store_slug]`.
 *
 * @returns {React.ReactElement} Animated placeholder grid.
 */
export default function LoadingStore(): React.ReactElement {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-stone-200" />
          <div className="space-y-2">
            <div className="w-48 h-6 bg-stone-200 rounded" />
            <div className="w-28 h-4 bg-stone-100 rounded" />
          </div>
        </div>
        <div className="w-32 h-10 bg-stone-200 rounded-2xl" />
      </div>

      {/* Search & Filter Skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1 h-12 bg-stone-200 rounded-2xl" />
        <div className="w-40 h-12 bg-stone-200 rounded-2xl" />
      </div>

      {/* Products Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="bg-white rounded-3xl border border-stone-200 p-4 space-y-4">
            <div className="w-full h-44 bg-stone-200 rounded-2xl" />
            <div className="h-5 bg-stone-200 rounded w-3/4" />
            <div className="flex justify-between items-center pt-2">
              <div className="h-6 bg-stone-200 rounded w-16" />
              <div className="h-9 bg-stone-200 rounded-xl w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
