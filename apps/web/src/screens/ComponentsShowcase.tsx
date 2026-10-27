import { useState } from "react";
import { Inbox, Trash2 } from "lucide-react";
import { RANGES } from "@forja/domain";
import { Button, IconButton } from "../components/Button.tsx";
import { Dialog } from "../components/Dialog.tsx";
import { Banner, EmptyState, ErrorState, Skeleton } from "../components/Feedback.tsx";
import { FormField, TextInput } from "../components/FormField.tsx";
import { useSnackbar } from "../components/Snackbar.tsx";
import { Stepper } from "../components/Stepper.tsx";
import { saveThemePreference, THEME_PREFERENCES, type ThemePreference } from "../design/theme.ts";
import styles from "./Screens.module.css";

// Vitrine dos componentes de UX-06 — disponível somente em desenvolvimento, para revisão
// visual e testes de acessibilidade (SEG-03). Dados fictícios.
const THEME_LABELS: Record<ThemePreference, string> = {
  system: "Sistema",
  light: "Claro",
  dark: "Escuro",
};

export function ComponentsShowcase() {
  const [load, setLoad] = useState(60);
  const [reps, setReps] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const showSnackbar = useSnackbar();

  return (
    <div className={styles.stack}>
      <h1 tabIndex={-1} className={styles.screenTitle}>
        Componentes
      </h1>

      <section className={styles.stack} aria-label="Tema">
        <div className={styles.row}>
          {THEME_PREFERENCES.map((preference) => (
            <Button
              key={preference}
              size="sm"
              onClick={() => {
                saveThemePreference(preference);
              }}
            >
              {THEME_LABELS[preference]}
            </Button>
          ))}
        </div>
      </section>

      <section className={styles.stack} aria-label="Botões">
        <div className={styles.row}>
          <Button variant="primary" size="lg">
            Concluir série 2
          </Button>
          <Button>Secundário</Button>
          <Button variant="ghost">Texto</Button>
          <Button variant="danger" icon={<Trash2 size={20} aria-hidden="true" />}>
            Descartar
          </Button>
          <Button loading>Salvando</Button>
          <IconButton label="Excluir registro" icon={<Trash2 size={20} aria-hidden="true" />} />
        </div>
      </section>

      <section className={styles.row} aria-label="Ajuste de valores">
        <Stepper
          label="Carga"
          unit="kg"
          value={load}
          step={2.5}
          range={RANGES.loadKg}
          onChange={setLoad}
          size="metric"
        />
        <Stepper
          label="Repetições"
          value={reps}
          step={1}
          range={RANGES.reps}
          onChange={setReps}
          size="metric"
        />
      </section>

      <FormField
        label="Nome"
        help="Como você quer ser chamado."
        error={name === "" ? "Informe o nome." : undefined}
      >
        {(control) => (
          <TextInput
            {...control}
            value={name}
            autoComplete="name"
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
        )}
      </FormField>

      <section className={styles.stack} aria-label="Avisos">
        <Banner tone="info">Disponível offline · atualizado às 14:32</Banner>
        <Banner tone="warning" onDismiss={() => undefined}>
          Você tem treinos não enviados desde 24/10.
        </Banner>
        <Banner tone="danger">Não foi possível salvar neste aparelho.</Banner>
      </section>

      <div className={styles.row}>
        <Button
          onClick={() => {
            showSnackbar({
              text: "Série registrada.",
              action: { label: "Desfazer", onAction: () => undefined },
            });
          }}
        >
          Mostrar confirmação
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            setDialogOpen(true);
          }}
        >
          Descartar sessão
        </Button>
      </div>

      <Dialog
        open={dialogOpen}
        title="Descartar sessão?"
        confirmLabel="Descartar"
        destructive
        onConfirm={() => {
          setDialogOpen(false);
        }}
        onCancel={() => {
          setDialogOpen(false);
        }}
      >
        As 6 séries registradas do Treino B serão perdidas.
      </Dialog>

      <Skeleton />
      <EmptyState
        icon={<Inbox size={32} />}
        title="Nada por aqui"
        description="Quando houver registros, eles aparecem aqui."
      />
      <ErrorState
        title="Não foi possível carregar"
        description="Seus dados salvos neste aparelho estão seguros."
        onRetry={() => undefined}
      />
    </div>
  );
}
