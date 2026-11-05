import { navItemsFor, isActive, type NavArea } from "../app/navigation.ts";
import { Link } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import { SyncIndicator } from "./SyncIndicator.tsx";
import styles from "./Navigation.module.css";

// UX-06 §3: cabeçalho, barra inferior (< 1024 px), trilho lateral (≥ 1024 px) e chave de área.

export function AppHeader({
  title,
  area,
  showAreaSwitch,
}: {
  title: string;
  area: NavArea;
  showAreaSwitch: boolean;
}) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title} tabIndex={-1}>
        {title}
      </h1>
      <div className={styles.headerActions}>
        {showAreaSwitch ? <AreaSwitch area={area} /> : null}
        <SyncIndicator />
      </div>
    </header>
  );
}

export function AreaSwitch({ area }: { area: NavArea }) {
  const options: { value: NavArea; label: string; path: string }[] = [
    { value: "aluno", label: TEXTS.nav.myTraining, path: "/hoje" },
    { value: "gestao", label: TEXTS.nav.management, path: "/gestao/programa" },
  ];
  return (
    <nav aria-label={TEXTS.nav.areaLabel} className={styles.areaSwitch}>
      {options.map((option) => (
        <Link
          key={option.value}
          to={option.path}
          className={styles.areaOption}
          aria-current={option.value === area ? "page" : undefined}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}

export function MainNav({
  area,
  automatic,
  pathname,
  variant,
}: {
  area: NavArea;
  automatic: boolean;
  pathname: string;
  variant: "bottom" | "rail";
}) {
  return (
    <nav aria-label={TEXTS.nav.mainLabel} className={styles[variant]}>
      <ul className={styles.navList}>
        {navItemsFor(area, automatic).map(({ path, label, icon: Icon }) => {
          const active = isActive(path, pathname);
          return (
            <li key={path}>
              <Link to={path} className={styles.navItem} aria-current={active ? "page" : undefined}>
                <Icon size={24} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
