import { Construction, MapPinOff } from "lucide-react";
import { Button } from "../components/Button.tsx";
import { EmptyState } from "../components/Feedback.tsx";
import { navigate } from "../app/router.tsx";
import { HOME_PATH, type RouteDefinition } from "../app/routes.ts";
import { TEXTS } from "../app/texts.ts";
import styles from "./Screens.module.css";

// Telas ainda não implementadas mostram, de forma honesta, em que tarefa serão entregues.
// Nas áreas com cabeçalho o título já está no h1 do cabeçalho; nas demais, a tela o exibe.
export function PendingScreen({
  route,
  showTitle,
}: {
  route: RouteDefinition;
  showTitle: boolean;
}) {
  return (
    <>
      {showTitle ? (
        <h1 tabIndex={-1} className={styles.screenTitle}>
          {route.title}
        </h1>
      ) : null}
      <EmptyState
        icon={<Construction size={32} />}
        title={TEXTS.pending.title}
        description={TEXTS.pending.description(route.task)}
      />
    </>
  );
}

export function NotFoundScreen() {
  return (
    <EmptyState
      icon={<MapPinOff size={32} />}
      title={TEXTS.notFound.title}
      description={TEXTS.notFound.description}
      action={
        <Button
          variant="primary"
          onClick={() => {
            navigate(HOME_PATH);
          }}
        >
          {TEXTS.notFound.action}
        </Button>
      }
    />
  );
}
