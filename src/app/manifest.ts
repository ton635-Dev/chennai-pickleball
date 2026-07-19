import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chennai Pickleball",
    short_name: "Pickleball",
    description: "チェンナイ ピックルボールサークルの活動管理アプリ",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4F7F5",
    theme_color: "#0E7C63",
    lang: "ja",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
