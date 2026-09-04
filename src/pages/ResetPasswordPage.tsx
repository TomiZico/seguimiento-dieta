import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export function ResetPasswordPage({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      toast.success("Contraseña actualizada");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-1px)] max-w-md flex-col justify-center px-4 py-8">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-primary/15 text-primary">
          <KeyRound className="size-6" />
        </div>
        <h1 className="text-xl font-semibold">Elegí una contraseña nueva</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="new-password" className="text-xs text-muted-foreground">
            Contraseña nueva
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 min-h-[44px] w-full rounded-md bg-foreground/5 px-3 text-sm ring-1 ring-border outline-none focus:ring-primary"
          />
        </div>

        {error && (
          <p className="rounded-md bg-danger/10 p-2 text-xs text-danger ring-1 ring-danger/30">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="min-h-[48px] w-full rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors disabled:opacity-40"
        >
          {busy ? "Un momento…" : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}
