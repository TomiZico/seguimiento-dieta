import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fetchMealsInRange } from "@/lib/dietService";
import { monthLabel, monthRange, weekRange } from "@/lib/date";
import { computeAdherence, groupAdherenceByDay } from "@/lib/statsService";
import type { Meal } from "@/lib/types";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-border">
      <div className="font-mono text-2xl font-semibold leading-none text-foreground">{value}</div>
      <div className="mt-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function WeekBars({ meals, start }: { meals: Meal[]; start: string }) {
  const byDay = groupAdherenceByDay(meals);
  const map = new Map(byDay.map((d) => [d.date, d.percent]));
  const first = new Date(start + "T00:00:00");
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(first);
    d.setDate(first.getDate() + i);
    const off = d.getTimezoneOffset();
    const iso = new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
    return {
      iso,
      label: d.toLocaleDateString("es-AR", { weekday: "narrow" }),
      percent: map.get(iso) ?? 0,
    };
  });

  return (
    <div className="flex items-end gap-2" role="img" aria-label="Adherencia por día de la semana">
      {days.map((d) => (
        <div key={d.iso} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="font-mono text-[10px] text-muted-foreground">
            {d.percent > 0 ? `${d.percent}%` : ""}
          </span>
          <div className="h-24 w-full overflow-hidden rounded-t-md bg-muted">
            <div
              className="w-full rounded-t-md bg-primary transition-[height]"
              style={{
                height: `${Math.max(d.percent, 2)}%`,
                marginTop: `${100 - Math.max(d.percent, 2)}%`,
              }}
            />
          </div>
          <span className="text-[10px] uppercase text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function EstadisticasPage() {
  const [weekMeals, setWeekMeals] = useState<Meal[]>([]);
  const [monthMeals, setMonthMeals] = useState<Meal[]>([]);
  const week = weekRange(new Date());
  const month = monthRange(new Date());

  useEffect(() => {
    (async () => {
      try {
        const [w, m] = await Promise.all([
          fetchMealsInRange(week.start, week.end),
          fetchMealsInRange(month.start, month.end),
        ]);
        setWeekMeals(w);
        setMonthMeals(m);
      } catch (err) {
        toast.error("No pude cargar las estadísticas", {
          description: err instanceof Error ? err.message : String(err),
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weekStats = computeAdherence(weekMeals);
  const monthStats = computeAdherence(monthMeals);

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-4">
      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          Esta semana
        </p>
        <div className="mt-3 rounded-xl bg-card p-4 ring-1 ring-border">
          <WeekBars meals={weekMeals} start={week.start} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatTile label="Adherencia" value={`${weekStats.percent}%`} />
          <StatTile label="Comidas" value={String(weekStats.comidas)} />
          <StatTile label="Salteadas" value={String(weekStats.salteadas)} />
        </div>
      </section>

      <section className="mt-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground capitalize">
          {monthLabel(new Date())}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <StatTile label="Adherencia mensual" value={`${monthStats.percent}%`} />
          <StatTile label="Total de comidas" value={String(monthStats.total)} />
          <StatTile label="Comidas cumplidas" value={String(monthStats.comidas)} />
          <StatTile label="Comidas salteadas" value={String(monthStats.salteadas)} />
        </div>
      </section>
    </div>
  );
}
