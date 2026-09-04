import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  passwordRecovery: boolean;
  clearPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  loading: true,
  passwordRecovery: false,
  clearPasswordRecovery: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    // Si falla (ej. sin red al abrir la app), no nos quedamos colgados en
    // loading para siempre: onAuthStateChange abajo también dispara con la
    // sesión guardada apenas se puede, así que igual se recupera sola.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setLoading(false);
      // Supabase abre este link con una sesión temporal y este evento: hay
      // que mostrar la pantalla de "elegí una contraseña nueva" en vez de
      // mandar directo a la app como si fuera un login normal.
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        passwordRecovery,
        clearPasswordRecovery: () => setPasswordRecovery(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
