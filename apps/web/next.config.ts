import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@proxi-commerce/types"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/product-images/**",
      },
    ],
  },
};

export default nextConfig;
