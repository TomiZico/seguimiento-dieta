import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

// Diagnóstico temporal: confirma en el log de build de Vercel si las
// variables de entorno realmente llegan al proceso de build, y con qué
// longitud (para detectar espacios/saltos de línea de más), sin exponer
// ningún valor. Se saca una vez resuelto (ver README).
for (const key of ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_VAPID_PUBLIC_KEY"]) {
  const value = process.env[key];
  console.log(`[env-check] ${key}: presente=${Boolean(value)} longitud=${value?.length ?? 0}`);
}

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
