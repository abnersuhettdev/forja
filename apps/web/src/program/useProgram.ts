import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "../auth/client.ts";
import { fetchProgram, type ProgramView } from "./program.ts";

export type ProgramState =
  | { readonly status: "loading" }
  | { readonly status: "unavailable" }
  | { readonly status: "ready"; readonly program: ProgramView };

// Gestão lê o programa do servidor (RF-093: gestão exige conexão; o modo offline do aluno
// chega na TAR-017).
export function useProgram(studentId: string | null): {
  state: ProgramState;
  reload: () => Promise<void>;
} {
  const [state, setState] = useState<ProgramState>({ status: "loading" });

  const reload = useCallback(async () => {
    const supabase = getSupabase();
    if (studentId === null || supabase === null) return;
    try {
      setState({ status: "ready", program: await fetchProgram(supabase, studentId) });
    } catch {
      setState({ status: "unavailable" });
    }
  }, [studentId]);

  useEffect(() => {
    const supabase = getSupabase();
    if (studentId === null || supabase === null) return;
    let active = true;
    fetchProgram(supabase, studentId).then(
      (program) => {
        if (active) setState({ status: "ready", program });
      },
      () => {
        if (active) setState({ status: "unavailable" });
      },
    );
    return () => {
      active = false;
    };
  }, [studentId]);

  return { state, reload };
}
