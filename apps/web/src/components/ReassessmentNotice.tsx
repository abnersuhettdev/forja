import { useState } from "react";
import { CalendarCheck } from "lucide-react";
import { addDays, daysBetween, isReassessmentDue } from "@forja/domain";
import { postponeReassessment } from "../evolution/reassessment.ts";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { useOfflineData } from "../offline/OfflineDataProvider.tsx";
import { formatShortDate } from "../training/format.ts";
import { navigate } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import { Button } from "./Button.tsx";
import { Banner } from "./Feedback.tsx";
import { FormField, TextInput } from "./FormField.tsx";
import { Sheet } from "./Sheet.tsx";
import { useSnackbar } from "./Snackbar.tsx";
import styles from "./ReassessmentNotice.module.css";

const T = TEXTS.reassessment;
export const REASSESSMENT_PATH = "/reavaliacao";

// Lembrete de reavaliação em Hoje (TELA-010; RF-083, RF-085; RN-014, RN-015): aparece na data de
// TRN-05 §3.1, nunca bloqueia e pode ser adiado para uma data escolhida, sem limite.
export function ReassessmentNotice({ today }: { today: string }) {
  const { state, reloadLocal } = useOfflineData();
  const local = useLocalData();
  const show = useSnackbar();
  const suggested = addDays(today, 7);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(suggested);
  const [invalid, setInvalid] = useState(false);
  const info = state.status === "ready" ? state.reassessment : null;
  if (info === null || !isReassessmentDue(info, today)) return null;

  async function postpone() {
    if (local === null) return;
    if (date <= today) {
      setInvalid(true);
      return;
    }
    await postponeReassessment(local.db, local.userId, date);
    setOpen(false);
    await reloadLocal();
    void local.engine.syncNow();
    show({ text: T.postpone.saved(formatShortDate(date)) });
  }

  return (
    <section className={styles.notice} aria-labelledby="reavaliacao-titulo">
      <div className={styles.head}>
        <CalendarCheck size={22} aria-hidden="true" className={styles.icon} />
        <div>
          <h2 id="reavaliacao-titulo" className={styles.title}>
            {T.notice.title}
          </h2>
          <p className={styles.body}>{T.notice.body(daysBetween(info.lastAssessedOn, today))}</p>
        </div>
      </div>
      <div className={styles.actions}>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            navigate(REASSESSMENT_PATH);
          }}
        >
          {T.notice.now}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={styles.later}
          onClick={() => {
            setDate(suggested);
            setInvalid(false);
            setOpen(true);
          }}
        >
          {T.notice.later}
        </Button>
      </div>
      <Sheet
        open={open}
        title={T.postpone.title}
        onClose={() => {
          setOpen(false);
        }}
      >
        <form
          className={styles.form}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void postpone();
          }}
        >
          {invalid ? <Banner tone="danger">{T.postpone.invalid}</Banner> : null}
          <FormField label={T.postpone.date} help={T.postpone.hint}>
            {(control) => (
              <TextInput
                {...control}
                type="date"
                min={addDays(today, 1)}
                value={date}
                onChange={(event) => {
                  setInvalid(false);
                  setDate(event.target.value);
                }}
              />
            )}
          </FormField>
          <Button type="submit" variant="primary" size="lg">
            {T.postpone.confirm}
          </Button>
        </form>
      </Sheet>
    </section>
  );
}
