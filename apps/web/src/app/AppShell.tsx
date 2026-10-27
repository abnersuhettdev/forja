import { useEffect, useState } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary.tsx";
import { AppHeader, MainNav } from "../components/Navigation.tsx";
import type { NavArea } from "./navigation.ts";
import { matchRoute } from "./route-match.ts";
import { navigate, usePathname } from "./router.tsx";
import { HOME_PATH, ROUTES, type RouteDefinition } from "./routes.ts";
import { ComponentsShowcase } from "../screens/ComponentsShowcase.tsx";
import { NotFoundScreen, PendingScreen } from "../screens/PlaceholderScreens.tsx";
import styles from "./AppShell.module.css";
import { TEXTS } from "./texts.ts";

const SHOWCASE_PATH = "/_componentes";

function findRoute(pathname: string): RouteDefinition | null {
  return ROUTES.find((route) => matchRoute(route.pattern, pathname) !== null) ?? null;
}

export function AppShell() {
  const pathname = usePathname();
  const route = findRoute(pathname);
  // Conta pertence às duas áreas: mantém a navegação da última área visitada (UX-03 §3).
  const [lastArea, setLastArea] = useState<NavArea>("aluno");
  const routeArea = route?.area === "aluno" || route?.area === "gestao" ? route.area : null;
  if (routeArea !== null && routeArea !== lastArea) setLastArea(routeArea);

  useEffect(() => {
    if (pathname === "/") navigate(HOME_PATH, { replace: true });
  }, [pathname]);

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

  const withNavigation =
    route === null || route.area === "aluno" || route.area === "gestao" || route.area === "conta";
  const area = routeArea ?? lastArea;

  return (
    <div className={withNavigation ? styles.withNav : undefined}>
      {withNavigation ? <AppHeader title={title} area={area} showAreaSwitch /> : null}
      <main className={styles.main}>
        <ErrorBoundary resetKey={pathname}>
          {route ? <PendingScreen route={route} showTitle={!withNavigation} /> : <NotFoundScreen />}
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
