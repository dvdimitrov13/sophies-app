import type { MetadataRoute } from "next";

/** Lets "Add to Home Screen" install the app with its own name and icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bulganki",
    short_name: "Bulganki",
    description: "Learn Bulgarian with spaced repetition flashcards",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f5ec",
    theme_color: "#f3f5ec",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
