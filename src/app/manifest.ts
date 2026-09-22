import type { MetadataRoute } from "next";

/**
 * PWA web app manifest — Next.js serves this at /manifest.webmanifest
 * and links it automatically, no manual <link rel="manifest"> needed.
 *
 * This is what makes "Add to Home Screen" on a phone produce a real
 * app icon + standalone (no browser chrome) launch instead of a
 * generic bookmark, and what satisfies the installability checks
 * browsers use to offer an "Install app" prompt.
 *
 * Colors match the brand tokens in src/app/globals.css /
 * claude/Agaram_Visual_Design_System_v1.md — theme_color is Agaramiya
 * Maroon (matches the icon background and the browser chrome color
 * Android shows around the app), background_color is Warm Ivory
 * (shown briefly as the splash-screen background before the app's
 * own first paint).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Agaramiya — A verified, Tamil-first matrimonial platform",
    short_name: "Agaramiya",
    description:
      "A verified, Tamil-first matrimonial platform. Browse introductions, express interest, and connect once both sides say yes.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#FAF7F2",
    theme_color: "#8E2346",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
