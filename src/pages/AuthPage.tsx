import { useState, type FormEvent } from "react";
import { Salad } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Mode = "login" | "signup";

export function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setNotice("Cuenta creada. Revisá tu email para confirmarla y después iniciá sesión.");
          setMode("login");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
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
          <Salad className="size-6" />
        </div>
        <h1 className="text-xl font-semibold">Seguimiento de Dieta</h1>
        <p className="text-sm text-muted-foreground">
          {mode === "login" ? "Iniciá sesión para ver tu dieta" : "Creá tu cuenta"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="email" className="text-xs text-muted-foreground">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 min-h-[44px] w-full rounded-md bg-foreground/5 px-3 text-sm ring-1 ring-border outline-none focus:ring-primary"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-xs text-muted-foreground">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
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
        {notice && (
          <p className="rounded-md bg-primary/10 p-2 text-xs text-primary ring-1 ring-primary/30">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="min-h-[48px] w-full rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors disabled:opacity-40"
        >
          {busy ? "Un momento…" : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setError(null);
          setNotice(null);
        }}
        className="mt-4 text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        {mode === "login" ? "¿No tenés cuenta? Creá una" : "¿Ya tenés cuenta? Iniciá sesión"}
      </button>
    </div>
  );
}
