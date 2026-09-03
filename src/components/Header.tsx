import { Link, useLocation } from "react-router-dom";
import { Settings, Upload } from "lucide-react";

const TITLES: Record<string, { eyebrow: string; title: string }> = {
  "/": { eyebrow: "Dieta", title: "Hoy" },
  "/calendario": { eyebrow: "Dieta", title: "Calendario" },
  "/estadisticas": { eyebrow: "Dieta", title: "Estadísticas" },
  "/subir": { eyebrow: "Dieta", title: "Subir dieta" },
  "/configuracion": { eyebrow: "Dieta", title: "Configuración" },
};

export function Header() {
  const location = useLocation();
  const meta = TITLES[location.pathname] ?? { eyebrow: "Dieta", title: "" };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between py-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.3em] text-primary">{meta.eyebrow}</div>
          <h1 className="text-xl font-semibold leading-tight">{meta.title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            to="/subir"
            aria-label="Subir dieta"
            className="grid size-10 place-items-center rounded-full text-muted-foreground ring-1 ring-border transition-colors hover:text-foreground"
          >
            <Upload className="size-4.5" />
          </Link>
          <Link
            to="/configuracion"
            aria-label="Configuración"
            className="grid size-10 place-items-center rounded-full text-muted-foreground ring-1 ring-border transition-colors hover:text-foreground"
          >
            <Settings className="size-4.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
