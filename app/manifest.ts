import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Le Jardin Financeiro",
    short_name: "Le Jardin",
    description: "Gestão financeira da cafeteria e floricultura Le Jardin.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5ef",
    theme_color: "#344435",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
