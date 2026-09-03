import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { HoyPage } from "@/pages/HoyPage";
import { CalendarioPage } from "@/pages/CalendarioPage";
import { EstadisticasPage } from "@/pages/EstadisticasPage";
import { ConfiguracionPage } from "@/pages/ConfiguracionPage";

// Lazy: arrastra xlsx + pdf.js, que son pesados y solo hacen falta al subir una dieta.
const SubirDietaPage = lazy(() =>
  import("@/pages/SubirDietaPage").then((m) => ({ default: m.SubirDietaPage })),
);

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
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
