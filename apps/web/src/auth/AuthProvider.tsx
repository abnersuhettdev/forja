import { createContext, use, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "./client.ts";

// Estado da sessão (DAD-05 §3). Expiração ou revogação pelo servidor não remove dados locais
// (RN-052 d): só a saída explícita (useSignOut) limpa o aparelho.
export type AuthState =
  | { status: "unconfigured" }
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; userId: string; email: string };

const AuthContext = createContext<AuthState>({ status: "loading" });

function fromSession(session: Session | null): AuthState {
  if (session === null) return { status: "signedOut" };
  return { status: "signedIn", userId: session.user.id, email: session.user.email ?? "" };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    getSupabase() === null ? { status: "unconfigured" } : { status: "loading" },
  );

  useEffect(() => {
    const supabase = getSupabase();
    if (supabase === null) return;
    // O evento inicial traz a sessão guardada no aparelho (inclusive offline).
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(fromSession(session));
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext value={state}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  return use(AuthContext);
}
