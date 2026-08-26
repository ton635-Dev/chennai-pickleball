import type { MetadataRoute } from "next";
import {
  APP_NAME,
  APP_SHORT_NAME,
  APP_DESCRIPTION,
  ICON_SUFFIX,
} from "@/lib/branding";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4F7F5",
    theme_color: "#0E7C63",
    lang: "ja",
    icons: [
      { src: `/icon-192${ICON_SUFFIX}.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `/icon-512${ICON_SUFFIX}.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `/icon-512${ICON_SUFFIX}.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
