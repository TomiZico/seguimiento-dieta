import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

// Diagnóstico temporal: confirma en el log de build de Vercel si las
// variables de entorno realmente llegan al proceso de build, sin exponer
// ningún valor. Se saca una vez resuelto (ver README).
console.log("[env-check] VITE_SUPABASE_URL presente:", Boolean(process.env.VITE_SUPABASE_URL));
console.log(
  "[env-check] VITE_SUPABASE_ANON_KEY presente:",
  Boolean(process.env.VITE_SUPABASE_ANON_KEY),
);
console.log(
  "[env-check] VITE_VAPID_PUBLIC_KEY presente:",
  Boolean(process.env.VITE_VAPID_PUBLIC_KEY),
);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectRegister: false,
      manifest: {
        name: "Seguimiento de Dieta",
        short_name: "Dieta",
        description: "Seguimiento de dieta mensual y notificaciones de comidas",
        theme_color: "#2f6b4f",
        background_color: "#faf7f2",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      injectManifest: {
        injectionPoint: undefined,
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
