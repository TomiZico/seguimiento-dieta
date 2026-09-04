import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";
import { buildShoppingList } from "@/lib/shoppingList";
import type { Meal } from "@/lib/types";

export function ShoppingList({ meals, label }: { meals: Meal[]; label: string }) {
  const items = useMemo(() => buildShoppingList(meals), [meals]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (item: string) => setChecked((prev) => ({ ...prev, [item]: !prev[item] }));

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(items.map((i) => `- ${i}`).join("\n"));
      toast.success("Lista copiada");
    } catch {
      toast.error("No pude copiar la lista");
    }
  };

  if (items.length === 0) {
    return (
      <p className="rounded-xl bg-card/60 p-4 text-center text-sm text-muted-foreground ring-1 ring-border">
        No hay comidas cargadas en {label} para armar la lista.
      </p>
    );
  }

  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-border">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Armada automáticamente a partir de {label}. Revisala antes de ir a comprar.
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-border hover:text-foreground"
        >
          <Copy className="size-3" />
          Copiar
        </button>
      </div>
      <ul className="mt-3 space-y-1">
        {items.map((item) => (
          <li key={item}>
            <button
              type="button"
              onClick={() => toggle(item)}
              className="flex w-full items-center gap-2 rounded-md py-1.5 text-left text-sm"
            >
              <span
                className={`grid size-4 shrink-0 place-items-center rounded ring-1 ${
                  checked[item] ? "bg-primary text-primary-foreground ring-primary" : "ring-border"
                }`}
              >
                {checked[item] && <Check className="size-3" />}
              </span>
              <span className={checked[item] ? "text-muted-foreground line-through" : ""}>
                {item}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
