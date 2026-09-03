import { NavLink } from "react-router-dom";
import { CalendarDays, ChartColumn, UtensilsCrossed } from "lucide-react";

const items = [
  { to: "/", label: "Hoy", icon: UtensilsCrossed, end: true },
  { to: "/calendario", label: "Calendario", icon: CalendarDays, end: false },
  { to: "/estadisticas", label: "Estadísticas", icon: ChartColumn, end: false },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-md grid-cols-3">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            <Icon className="size-5" strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
