import type { MetadataRoute } from "next";

/** Install Portfedia like an app (#41): home screen icon, full-screen window, shortcuts. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Portfedia",
    short_name: "Portfedia",
    description: "The living encyclopedia of the business world.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1e5bf0",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Search", url: "/search" },
      { name: "Notifications", url: "/notifications" },
      { name: "Jobs", url: "/jobs" },
    ],
  };
}
