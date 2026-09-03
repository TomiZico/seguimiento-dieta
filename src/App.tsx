import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { TriangleAlert } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { HoyPage } from "@/pages/HoyPage";
import { CalendarioPage } from "@/pages/CalendarioPage";
import { EstadisticasPage } from "@/pages/EstadisticasPage";
import { ConfiguracionPage } from "@/pages/ConfiguracionPage";
import { isSupabaseConfigured } from "@/lib/supabase";

// Lazy: arrastra xlsx + pdf.js, que son pesados y solo hacen falta al subir una dieta.
const SubirDietaPage = lazy(() =>
  import("@/pages/SubirDietaPage").then((m) => ({ default: m.SubirDietaPage })),
);

function ConfigWarning() {
  if (isSupabaseConfigured) return null;
  return (
    <div className="mx-auto mt-4 flex max-w-md items-start gap-2 rounded-xl bg-warning/10 p-3 text-xs text-warning ring-1 ring-warning/30">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      <span>
        Faltan las variables de entorno de Supabase (<code>VITE_SUPABASE_URL</code> /{" "}
        <code>VITE_SUPABASE_ANON_KEY</code>). La app no va a poder cargar ni guardar datos hasta que
        se configuren y se vuelva a desplegar. Ver el README.
      </span>
    </div>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <ConfigWarning />
      <main>
        <Routes>
          <Route path="/" element={<HoyPage />} />
          <Route path="/calendario" element={<CalendarioPage />} />
          <Route path="/estadisticas" element={<EstadisticasPage />} />
          <Route
            path="/subir"
            element={
              <Suspense
                fallback={
                  <p className="mx-auto max-w-md px-4 pt-8 text-sm text-muted-foreground">
                    Cargando…
                  </p>
                }
              >
                <SubirDietaPage />
              </Suspense>
            }
          />
          <Route path="/configuracion" element={<ConfiguracionPage />} />
        </Routes>
      </main>
      <BottomNav />
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;
