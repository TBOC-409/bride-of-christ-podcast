import type { MetadataRoute } from "next";

/**
 * Makes the radio installable as an app. Next.js serves this at
 * /manifest.webmanifest and links it from every page.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "The Bride of Christ Podcast",
    short_name: "Bride Radio",
    description: "Live church radio from The Bride of Christ, with a private notepad.",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f0f9ff",
    theme_color: "#0ea5e9",
    categories: ["music", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
