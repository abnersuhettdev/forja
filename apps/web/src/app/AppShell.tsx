import { useEffect, useState, type ComponentType } from "react";
import { useAuth } from "../auth/AuthProvider.tsx";
import { ErrorBoundary } from "../components/ErrorBoundary.tsx";
import { ErrorState, Skeleton } from "../components/Feedback.tsx";
import { AppHeader, MainNav } from "../components/Navigation.tsx";
import type { NavArea } from "./navigation.ts";
import { matchRoute } from "./route-match.ts";
import { navigate, usePathname } from "./router.tsx";
import { HOME_PATH, ROUTES, type RouteDefinition } from "./routes.ts";
import { ComponentsShowcase } from "../screens/ComponentsShowcase.tsx";
import { AccountScreen } from "../screens/AccountScreen.tsx";
import { ChangePasswordScreen } from "../screens/ChangePasswordScreen.tsx";
import { LoginScreen } from "../screens/LoginScreen.tsx";
import { NotFoundScreen, PendingScreen } from "../screens/PlaceholderScreens.tsx";
import styles from "./AppShell.module.css";
import { TEXTS } from "./texts.ts";

const SHOWCASE_PATH = "/_componentes";
const LOGIN_PATH = "/entrar";

/** Telas já entregues; as demais mostram em que tarefa chegam (PendingScreen). */
const SCREENS: Readonly<Record<string, ComponentType>> = {
  "TELA-004": AccountScreen,
  "TELA-005": ChangePasswordScreen,
};

function findRoute(pathname: string): RouteDefinition | null {
  return ROUTES.find((route) => matchRoute(route.pattern, pathname) !== null) ?? null;
}

export function AppShell() {
  const pathname = usePathname();
  const route = findRoute(pathname);
  const auth = useAuth();
  // Conta pertence às duas áreas: mantém a navegação da última área visitada (UX-03 §3).
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

  const title = route?.title ?? TEXTS.notFound.title;

  useEffect(() => {
    document.title = `${title} · ${TEXTS.appName}`;
    // Foco no título ao trocar de tela (UX-07 §5, WCAG 2.4.3).
    document.querySelector<HTMLElement>("h1")?.focus();
  }, [pathname, title]);

  if (import.meta.env.DEV && pathname === SHOWCASE_PATH) {
    return (
      <main className={styles.bare}>
        <ComponentsShowcase />
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
      <main className={styles.main}>
        <LoginScreen />
      </main>
    );
  }

  const Screen = route ? SCREENS[route.screen] : undefined;
  const withNavigation =
    route === null || route.area === "aluno" || route.area === "gestao" || route.area === "conta";
  const area = routeArea ?? lastArea;

  return (
    <div className={withNavigation ? styles.withNav : undefined}>
      {withNavigation ? <AppHeader title={title} area={area} showAreaSwitch /> : null}
      <main className={styles.main}>
        <ErrorBoundary resetKey={pathname}>
          {Screen ? (
            <Screen />
          ) : route ? (
            <PendingScreen route={route} showTitle={!withNavigation} />
          ) : (
            <NotFoundScreen />
          )}
        </ErrorBoundary>
      </main>
      {withNavigation ? (
        <>
          <MainNav area={area} pathname={pathname} variant="bottom" />
          <MainNav area={area} pathname={pathname} variant="rail" />
        </>
      ) : null}
    </div>
  );
}
