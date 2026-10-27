// Destinos de navegação por área (UX-03 §3, ADR-025).
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  ChartLine,
  ClipboardList,
  Dumbbell,
  House,
  IdCard,
  Library,
  User,
} from "lucide-react";
import type { Area } from "./routes.ts";
import { TEXTS } from "./texts.ts";

export interface NavItem {
  readonly path: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

export type NavArea = Extract<Area, "aluno" | "gestao">;

export const NAV_ITEMS: Readonly<Record<NavArea, readonly NavItem[]>> = {
  aluno: [
    { path: "/hoje", label: TEXTS.nav.today, icon: House },
    { path: "/treinos", label: TEXTS.nav.workouts, icon: Dumbbell },
    { path: "/agenda", label: TEXTS.nav.calendar, icon: CalendarDays },
    { path: "/evolucao", label: TEXTS.nav.progress, icon: ChartLine },
    { path: "/conta", label: TEXTS.nav.account, icon: User },
  ],
  gestao: [
    { path: "/gestao/programa", label: TEXTS.nav.program, icon: ClipboardList },
    { path: "/gestao/catalogo", label: TEXTS.nav.catalog, icon: Library },
    { path: "/gestao/perfil", label: TEXTS.nav.profile, icon: IdCard },
    { path: "/conta", label: TEXTS.nav.account, icon: User },
  ],
};

/** Destino ativo: o item cujo caminho é prefixo do caminho atual. */
export function isActive(itemPath: string, pathname: string): boolean {
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}
