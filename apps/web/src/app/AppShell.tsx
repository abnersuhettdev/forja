import { useEffect, useState, type ComponentType } from "react";
import { appModeOf } from "../account/context.ts";
import { useUserContext } from "../account/UserContextProvider.tsx";
import { useAuth } from "../auth/AuthProvider.tsx";
import { ErrorBoundary } from "../components/ErrorBoundary.tsx";
import { LockedKept } from "../components/LockedKept.tsx";
import { UpdateBanner } from "../components/UpdateBanner.tsx";
import { ErrorState, Skeleton } from "../components/Feedback.tsx";
import { AppHeader, MainNav } from "../components/Navigation.tsx";
import type { NavArea } from "./navigation.ts";
import { matchRoute } from "./route-match.ts";
import { onlineScreen, type ScreenProps } from "./onlineScreen.tsx";
import { navigate, usePathname } from "./router.tsx";
import { HOME_PATH, ROUTES, type RouteDefinition } from "./routes.ts";
import { AccountScreen } from "../screens/AccountScreen.tsx";
import { CatalogScreen } from "../screens/CatalogScreen.tsx";
import { ExerciseScreen } from "../screens/ExerciseScreen.tsx";
import { LoginScreen } from "../screens/LoginScreen.tsx";
import { RestScreen } from "../screens/RestScreen.tsx";
import { SyncScreen } from "../screens/SyncScreen.tsx";
import { EvolutionScreen } from "../screens/EvolutionScreen.tsx";
import { CompleteScreen } from "../screens/CompleteScreen.tsx";
import { ExecutionScreen } from "../screens/ExecutionScreen.tsx";
import { TodayScreen, WorkoutScreen, WorkoutsScreen } from "../screens/TrainingScreens.tsx";
import { NotFoundScreen, PendingScreen } from "../screens/PlaceholderScreens.tsx";
import styles from "./AppShell.module.css";
import { TEXTS } from "./texts.ts";

const SHOWCASE_PATH = "/_componentes";
const LOGIN_PATH = "/entrar";
const ONBOARDING_PATH = "/configuracao-inicial";
const PLAN_PATH = "/plano";

// Gestão, configuração inicial e vitrine só funcionam online (RF-093) e saem do pacote inicial.
// As telas do dia a dia offline — inclusive o catálogo, consultável sem conexão (UX-08 §6.2) —
// ficam no pacote principal; as demais, marcadas com `true`, abrem offline pelo service worker.
const ProgramScreen = onlineScreen(() => import("../screens/ProgramScreen.tsx"), "ProgramScreen");
const DraftEditorScreen = onlineScreen(
  () => import("../screens/DraftEditorScreen.tsx"),
  "DraftEditorScreen",
);
const ExerciseFormScreen = onlineScreen(
  () => import("../screens/ExerciseFormScreen.tsx"),
  "ExerciseFormScreen",
);
const GenerateScreen = onlineScreen(
  () => import("../screens/GenerateScreen.tsx"),
  "GenerateScreen",
);
const PlanScreen = onlineScreen(() => import("../screens/PlanScreen.tsx"), "PlanScreen", true);
const ReassessmentScreen = onlineScreen(
  () => import("../screens/ReassessmentScreen.tsx"),
  "ReassessmentScreen",
);
const loadHistory = () => import("../screens/HistoryScreens.tsx");
const AgendaScreen = onlineScreen(loadHistory, "AgendaScreen", true);
const DayScreen = onlineScreen(loadHistory, "DayScreen", true);
const EditSessionScreen = onlineScreen(loadHistory, "EditSessionScreen", true);
const ChangePasswordScreen = onlineScreen(
  () => import("../screens/ChangePasswordScreen.tsx"),
  "ChangePasswordScreen",
  true,
);
const InstallScreen = onlineScreen(
  () => import("../screens/InstallScreen.tsx"),
  "InstallScreen",
  true,
);
const ProfileScreen = onlineScreen(() => import("../screens/ProfileScreen.tsx"), "ProfileScreen");
const AssessmentScreen = onlineScreen(
  () => import("../screens/AssessmentScreen.tsx"),
  "AssessmentScreen",
);
const OnboardingScreen = onlineScreen(
  () => import("../screens/OnboardingScreen.tsx"),
  "OnboardingScreen",
);
const ComponentsShowcase = onlineScreen(
  () => import("../screens/ComponentsShowcase.tsx"),
  "ComponentsShowcase",
);

/** Telas já entregues; as demais mostram em que tarefa chegam (PendingScreen). */
const SCREENS: Readonly<Record<string, ComponentType<ScreenProps>>> = {
  "TELA-006": RestScreen,
  "TELA-007": SyncScreen,
  "TELA-010": TodayScreen,
  "TELA-012": WorkoutsScreen,
  "TELA-013": WorkoutScreen,
  "TELA-015": ExecutionScreen,
  "TELA-017": CompleteScreen,
  "TELA-018": AgendaScreen,
  "TELA-019": DayScreen,
  "TELA-020": EditSessionScreen,
  "TELA-021": EvolutionScreen,
  "TELA-014": ExerciseScreen,
  "TELA-030": ProgramScreen,
  "TELA-031": DraftEditorScreen,
  "TELA-051": GenerateScreen,
  "TELA-060": PlanScreen,
  "TELA-050": ReassessmentScreen,
  "TELA-034": CatalogScreen,
  "TELA-037": ProfileScreen,
  "TELA-038": AssessmentScreen,
  "TELA-036": ExerciseFormScreen,
  "TELA-003": OnboardingScreen,
  "TELA-004": AccountScreen,
  "TELA-005": ChangePasswordScreen,
  "TELA-002": InstallScreen,
};

function findRoute(pathname: string): RouteDefinition | null {
  return ROUTES.find((route) => matchRoute(route.pattern, pathname) !== null) ?? null;
}

export function AppShell() {
  const pathname = usePathname();
  const route = findRoute(pathname);
  const auth = useAuth();
  const { state: userContext, refresh } = useUserContext();
  const context = userContext.status === "ready" ? userContext.context : null;
  const needsOnboarding = context !== null && context.student === null;
  const automatic = appModeOf(context) === "automatic";
  // Conta e telas comuns (ex.: detalhe do exercício) mantêm a navegação da última área (UX-03 §3).
  const [lastArea, setLastArea] = useState<NavArea>("aluno");
  const routeArea = route?.area === "aluno" || route?.area === "gestao" ? route.area : null;
  if (routeArea !== null && routeArea !== lastArea) setLastArea(routeArea);

  // Sem sessão, só a tela de login; com sessão, o login leva à área inicial (DAD-05 §3).
  useEffect(() => {
    if (import.meta.env.DEV && pathname === SHOWCASE_PATH) return;
    if (auth.status === "signedOut" && pathname !== LOGIN_PATH) {
      navigate(LOGIN_PATH, { replace: true });
    } else if (auth.status === "signedIn" && (pathname === "/" || pathname === LOGIN_PATH)) {
      navigate(HOME_PATH, { replace: true });
    }
  }, [auth.status, pathname]);

  // Primeiro acesso: sem aluno próprio, a configuração inicial vem antes de tudo (JOR-08).
  useEffect(() => {
    if (auth.status !== "signedIn" || context === null) return;
    if (needsOnboarding && pathname !== ONBOARDING_PATH) {
      navigate(ONBOARDING_PATH, { replace: true });
    } else if (!needsOnboarding && pathname === ONBOARDING_PATH) {
      // ADR-095: no Automático, a configuração inicial termina na rotina proposta.
      navigate(automatic ? PLAN_PATH : HOME_PATH, { replace: true });
    }
  }, [auth.status, context, needsOnboarding, pathname, automatic]);

  // ADR-095: cada modo tem seu caminho; Meus dados continua acessível nos dois.
  useEffect(() => {
    if (auth.status !== "signedIn" || context === null || needsOnboarding) return;
    if (automatic && /^\/gestao\/(programa|catalogo)(\/|$)/.test(pathname)) {
      navigate(PLAN_PATH, { replace: true });
    } else if (!automatic && pathname === PLAN_PATH) {
      navigate("/gestao/programa", { replace: true });
    }
  }, [auth.status, context, needsOnboarding, automatic, pathname]);

  const title = route?.title ?? TEXTS.notFound.title;

  useEffect(() => {
    document.title = `${title} · ${TEXTS.appName}`;
    // Foco no título ao trocar de tela (UX-07 §5, WCAG 2.4.3).
    document.querySelector<HTMLElement>("h1")?.focus();
  }, [pathname, title]);

  if (import.meta.env.DEV && pathname === SHOWCASE_PATH) {
    return (
      <main className={styles.bare}>
        <ComponentsShowcase area="aluno" params={{}} />
      </main>
    );
  }

  if (auth.status === "unconfigured") {
    return (
      <main className={styles.main}>
        <ErrorState title={TEXTS.error.title} description={TEXTS.auth.unconfigured} />
      </main>
    );
  }
  if (auth.status === "loading" || (auth.status === "signedOut" && pathname !== LOGIN_PATH)) {
    return (
      <main className={styles.main}>
        <Skeleton />
      </main>
    );
  }
  if (auth.status === "signedOut" || pathname === LOGIN_PATH) {
    return (
      <main>
        <LoginScreen />
      </main>
    );
  }

  if (userContext.status === "unavailable") {
    return (
      <main className={styles.main}>
        <ErrorState
          title={TEXTS.error.title}
          description={TEXTS.onboarding.unavailable}
          onRetry={() => {
            void refresh();
          }}
        />
      </main>
    );
  }
  if (
    userContext.status === "loading" ||
    (needsOnboarding && pathname !== ONBOARDING_PATH) ||
    (!needsOnboarding && pathname === ONBOARDING_PATH)
  ) {
    return (
      <main className={styles.main}>
        <Skeleton />
      </main>
    );
  }

  const Screen = route ? SCREENS[route.screen] : undefined;
  // Chave de área só com papel duplo (RF-005, ADR-003).
  const dualRole = !automatic && context !== null && context.isManager && context.student !== null;
  const withNavigation =
    route === null ||
    route.area === "aluno" ||
    route.area === "gestao" ||
    route.area === "conta" ||
    route.area === "comum";
  const area = automatic ? "aluno" : (routeArea ?? lastArea);

  return (
    <div className={withNavigation ? styles.withNav : undefined}>
      {withNavigation ? <AppHeader title={title} area={area} showAreaSwitch={dualRole} /> : null}
      <main className={styles.main}>
        {/* Pendências cifradas de uma saída anterior, ainda não liberadas (ADR-028 L6). */}
        {withNavigation ? <LockedKept /> : null}
        {withNavigation ? <UpdateBanner /> : null}
        <ErrorBoundary
          resetKey={pathname}
          context={route?.pattern ?? "desconhecida"}
          reloadPage={route?.area === "execucao"}
        >
          {Screen ? (
            <Screen area={area} params={matchRoute(route?.pattern ?? "", pathname) ?? {}} />
          ) : route ? (
            <PendingScreen route={route} showTitle={!withNavigation} />
          ) : (
            <NotFoundScreen />
          )}
        </ErrorBoundary>
      </main>
      {withNavigation ? (
        <>
          {/* No detalhe do treino, o botão fixo "Iniciar treino" ocupa o lugar da barra. */}
          {route?.screen === "TELA-013" ? null : (
            <MainNav area={area} automatic={automatic} pathname={pathname} variant="bottom" />
          )}
          <MainNav area={area} automatic={automatic} pathname={pathname} variant="rail" />
        </>
      ) : null}
    </div>
  );
}
