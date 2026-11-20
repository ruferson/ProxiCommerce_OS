import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ProxiCommerce Storefront",
    short_name: "ProxiCommerce",
    description: "Comercio local descentralizado y de proximidad",
    start_url: "/",
    display: "standalone",
    background_color: "#fdfcf9",
    theme_color: "#4f46e5",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
