import type { MetadataRoute } from "next";

/**
 * Lets crews add SmartSafe to their phone's home screen and open it full-screen
 * from a direct URL, with no app store (Oct 9 review: direct web access on mobile).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SmartSafe AI",
    short_name: "SmartSafe",
    description: "AI-assisted safety management for construction field teams.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f4f8",
    theme_color: "#2f6df6",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Report hazard", url: "/hazards/new", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "My work", url: "/work", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
