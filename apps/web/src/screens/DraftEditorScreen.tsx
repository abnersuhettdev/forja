import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { ArrowDown, ArrowUp, GripVertical, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import {
  EQUIPMENT_LABELS,
  MUSCLE_GROUP_LABELS,
  SPLIT_TYPES,
  type DraftIssue,
  type SplitType,
} from "@forja/domain";
import { draftIssues } from "@forja/domain/validacao";
import { useUserContext } from "../account/UserContextProvider.tsx";
import { fetchStudentProfile } from "../account/profile.ts";
import { getSupabase } from "../auth/client.ts";
import { filterCatalog, NO_FILTERS, type CatalogExercise } from "../catalog/catalog.ts";
import { useCatalog } from "../catalog/useCatalog.ts";
import { Button, IconButton } from "../components/Button.tsx";
import { Dialog } from "../components/Dialog.tsx";
import { Banner, EmptyState, ErrorState, Skeleton } from "../components/Feedback.tsx";
import { FormField, SelectInput, TextInput } from "../components/FormField.tsx";
import { Sheet } from "../components/Sheet.tsx";
import { useSnackbar } from "../components/Snackbar.tsx";
import { sendDirect } from "../local/direct.ts";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import {
  addItem,
  addWorkout,
  defaultItem,
  issueMessages,
  itemSummary,
  moveItem,
  moveWorkout,
  removeItem,
  removeWorkout,
  renameWorkout,
  suggestAlternatives,
  toSavePayload,
  updateItem,
  type EditorDocument,
  type EditorItem,
  type IssueMessage,
} from "../program/editor.ts";
import { regenerateInDocument, type RegenerationSummary } from "../program/generator.ts";
import type { VersionView } from "../program/program.ts";
import { useProgram } from "../program/useProgram.ts";
import { navigate } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import { useOnline } from "../app/useOnline.ts";
import { formatTime } from "./ProgramScreen.tsx";
import { GeneratorReportPanel } from "../components/GeneratorReportPanel.tsx";
import { RegenerationNote } from "../components/RegenerationNote.tsx";
import styles from "./Screens.module.css";

const T = TEXTS.editor;
const PROGRAM_PATH = "/gestao/programa";
const SAVE_DELAY_MS = 1000;

type SaveState =
  | { readonly kind: "idle" }
  | { readonly kind: "pending" }
  | { readonly kind: "saving" }
  | { readonly kind: "saved"; readonly at: string }
  | { readonly kind: "error" }
  | { readonly kind: "conflict" };

// TELA-031 — Editor de rascunho (RF-020, RF-024, RF-025; RN-021, RN-035). Salva sozinho no
// servidor a cada alteração; offline fica só leitura (RF-093). TELA-032 e TELA-033 são folhas.
export function DraftEditorScreen() {
  const { state: userState } = useUserContext();
  const studentId = userState.status === "ready" ? (userState.context.student?.id ?? null) : null;
  const { state, reload } = useProgram(studentId);
  const { state: catalogState } = useCatalog();

  if (state.status === "loading" || catalogState.status === "loading")
    return <Skeleton lines={8} />;
  if (state.status === "unavailable" || catalogState.status === "unavailable") {
    return (
      <ErrorState
        title={TEXTS.error.title}
        description={TEXTS.program.offline}
        onRetry={() => {
          void reload();
        }}
      />
    );
  }
  const draft = state.program.draft;
  if (draft === null) {
    return (
      <EmptyState
        icon={<Pencil size={32} />}
        title={T.noDraft}
        description=""
        action={
          <Button
            onClick={() => {
              navigate(PROGRAM_PATH);
            }}
          >
            {T.backToProgram}
          </Button>
        }
      />
    );
  }
  return (
    <Editor
      key={draft.id}
      draft={draft}
      studentId={studentId}
      catalog={catalogState.exercises}
      onReload={() => {
        void reload();
      }}
    />
  );
}

function Editor({
  draft,
  studentId,
  catalog,
  onReload,
}: {
  draft: VersionView;
  studentId: string | null;
  catalog: readonly CatalogExercise[];
  onReload: () => void;
}) {
  const local = useLocalData();
  const online = useOnline();
  const show = useSnackbar();
  const readOnly = !online;
  const [doc, setDoc] = useState<EditorDocument>(draft.document);
  const [save, setSave] = useState<SaveState>({ kind: "saved", at: draft.updated_at });
  const [issues, setIssues] = useState<IssueMessage[]>([]);
  const [confirm, setConfirm] = useState<"publish" | "discard" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ workoutId: string; swapItem?: EditorItem } | null>(null);
  const [editing, setEditing] = useState<{ workoutId: string; item: EditorItem } | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Readonly<Record<string, RegenerationSummary>>>({});
  // O que cada treino já mostrou nesta edição, para "gerar outro" não voltar logo ao mesmo.
  const shown = useRef(new Map<string, Set<string>>());

  // Salvamento serializado: um envio por vez, sempre do documento mais recente.
  const revision = useRef(draft.revision);
  const latest = useRef(doc);
  const dirty = useRef(false);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flush = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) await inFlight.current;
    if (!dirty.current || local === null) return true;
    dirty.current = false;
    setSave({ kind: "saving" });
    const run = sendDirect(local, {
      opId: crypto.randomUUID(),
      type: "draft.save",
      entityId: draft.id,
      baseRevision: revision.current,
      payload: toSavePayload(latest.current),
    }).then((result) => {
      if (result.ok) {
        if (result.revision !== undefined) revision.current = result.revision;
        setSave({ kind: "saved", at: new Date().toISOString() });
        return true;
      }
      dirty.current = true;
      setSave({ kind: result.kind === "conflict" ? "conflict" : "error" });
      return false;
    });
    inFlight.current = run;
    const ok = await run;
    inFlight.current = null;
    return ok;
  }, [draft.id, local]);

  function change(next: EditorDocument) {
    setDoc(next);
    latest.current = next;
    dirty.current = true;
    setSave({ kind: "pending" });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
  }

  // Nada se perde ao sair: o navegador pergunta antes de recarregar ou fechar com alterações
  // pendentes, e sair do editor dentro do app envia o que faltar.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty.current || inFlight.current !== null) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      clearTimeout(timer.current);
      if (dirty.current) void flush();
    };
  }, [flush]);

  const byId = new Map(catalog.map((e) => [e.id, e]));
  const nameOf = (id: string) => byId.get(id)?.name ?? TEXTS.catalog.notFound;

  /** RF-119: outro treino com os mesmos grupos, sem tocar nos demais; pode ser desfeito. */
  async function regenerate(workoutId: string) {
    const supabase = getSupabase();
    const workout = doc.workouts.find((w) => w.id === workoutId);
    if (supabase === null || studentId === null || workout === undefined) return;
    setRegenerating(workoutId);
    setError(null);
    try {
      const profile = await fetchStudentProfile(supabase, studentId);
      const current = latest.current;
      const target = current.workouts.find((w) => w.id === workoutId);
      if (target === undefined) return;
      const seen = shown.current.get(workoutId) ?? new Set<string>();
      const result = regenerateInDocument({
        doc: current,
        workoutId,
        profile,
        catalog,
        seen,
        nameOf,
      });
      if (result === null) {
        setError(T.regenerateProfile);
        return;
      }
      shown.current.set(workoutId, seen);
      const { doc: next, summary } = result;
      change(next);
      setSummaries((all) => ({ ...all, [workoutId]: summary }));
      show({
        text: T.regenerated(target.name),
        action: {
          label: TEXTS.common.undo,
          onAction: () => {
            change({
              ...latest.current,
              workouts: latest.current.workouts.map((w) =>
                w.id === workoutId ? { ...w, items: target.items } : w,
              ),
            });
            setSummaries((all) =>
              Object.fromEntries(Object.entries(all).filter(([id]) => id !== workoutId)),
            );
          },
        },
      });
    } catch {
      setError(T.regenerateFailed);
    } finally {
      setRegenerating(null);
    }
  }

  async function publish() {
    setConfirm(null);
    if (local === null) return;
    clearTimeout(timer.current);
    if (!(await flush())) return;
    const result = await sendDirect(local, {
      opId: crypto.randomUUID(),
      type: "draft.publish",
      entityId: draft.id,
      baseRevision: revision.current,
      payload: {},
    });
    if (result.ok) {
      show({ text: T.published });
      navigate(PROGRAM_PATH);
      return;
    }
    const serverIssues = result.error.details?.issues;
    if (result.error.code === "DRAFT_INVALID" && Array.isArray(serverIssues)) {
      setIssues(issueMessages(serverIssues as DraftIssue[], doc, nameOf));
      return;
    }
    setError(result.message);
  }

  function requestPublish() {
    const found = draftIssues(toSavePayload(doc), (id) => byId.has(id));
    if (found.length > 0) {
      setIssues(issueMessages(found, doc, nameOf));
      return;
    }
    setIssues([]);
    setConfirm("publish");
  }

  async function discard() {
    setConfirm(null);
    if (local === null) return;
    clearTimeout(timer.current);
    if (inFlight.current) await inFlight.current;
    const result = await sendDirect(local, {
      opId: crypto.randomUUID(),
      type: "draft.discard",
      entityId: draft.id,
      baseRevision: revision.current,
      payload: {},
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    show({ text: TEXTS.program.discarded });
    navigate(PROGRAM_PATH);
  }

  function goTo(message: IssueMessage) {
    const id = message.itemId ? `item-${message.itemId}` : `workout-${message.workoutId ?? ""}`;
    const target = document.getElementById(id);
    target?.scrollIntoView({ block: "center" });
    target?.focus();
  }

  function pick(exercise: CatalogExercise) {
    if (picker === null) return;
    const { workoutId, swapItem } = picker;
    setPicker(null);
    if (swapItem) {
      // Trocar mantém a prescrição; a medida acompanha o novo exercício.
      const item: EditorItem =
        swapItem.measure_type === exercise.measure_type
          ? { ...swapItem, exercise_id: exercise.id }
          : { ...defaultItem(swapItem.id, exercise), sets: swapItem.sets, rest_s: swapItem.rest_s };
      change(updateItem(doc, workoutId, item));
      setEditing({ workoutId, item });
      return;
    }
    const item = defaultItem(crypto.randomUUID(), exercise);
    change(addItem(doc, workoutId, item));
    setEditing({ workoutId, item });
  }

  const status =
    save.kind === "pending"
      ? T.pending
      : save.kind === "saving"
        ? T.saving
        : save.kind === "saved"
          ? T.savedAt(formatTime(save.at))
          : save.kind === "error"
            ? T.saveFailed
            : save.kind === "conflict"
              ? T.conflict
              : "";

  return (
    <div className={styles.stack}>
      {readOnly ? <Banner tone="info">{TEXTS.program.offline}</Banner> : null}
      {error !== null ? <Banner tone="danger">{error}</Banner> : null}
      {draft.generator_report ? <GeneratorReportPanel report={draft.generator_report} /> : null}
      <p className={styles.muted} role="status">
        {status}
        {save.kind === "conflict" ? (
          <>
            {" "}
            <Button size="sm" onClick={onReload}>
              {T.reload}
            </Button>
          </>
        ) : null}
        {save.kind === "error" ? (
          <>
            {" "}
            <Button size="sm" onClick={() => void flush()}>
              {TEXTS.error.retry}
            </Button>
          </>
        ) : null}
      </p>

      <FormField label={T.name}>
        {(control) => (
          <TextInput
            {...control}
            maxLength={80}
            value={doc.name}
            disabled={readOnly}
            onChange={(e) => {
              change({ ...doc, name: e.target.value });
            }}
          />
        )}
      </FormField>
      <FormField label={T.split}>
        {(control) => (
          <SelectInput
            {...control}
            value={doc.split_type ?? ""}
            disabled={readOnly}
            onChange={(e) => {
              change({
                ...doc,
                split_type: e.target.value === "" ? null : (e.target.value as SplitType),
              });
            }}
          >
            <option value="">{T.none}</option>
            {SPLIT_TYPES.map((value) => (
              <option key={value} value={value}>
                {T.splits[value]}
              </option>
            ))}
          </SelectInput>
        )}
      </FormField>
      <p className={styles.muted}>{T.dragHint}</p>

      <WorkoutList
        doc={doc}
        readOnly={readOnly}
        nameOf={nameOf}
        regenerating={regenerating}
        summaries={summaries}
        onRegenerate={(workoutId) => void regenerate(workoutId)}
        onChange={change}
        onAddExercise={(workoutId) => {
          setPicker({ workoutId });
        }}
        onEditItem={(workoutId, item) => {
          setEditing({ workoutId, item });
        }}
        onRemoveItem={(workoutId, item) => {
          const { doc: next, undo } = removeItem(doc, workoutId, item.id);
          change(next);
          show({
            text: T.removed(nameOf(item.exercise_id)),
            action: {
              label: TEXTS.common.undo,
              onAction: () => {
                change(undo(latest.current));
              },
            },
          });
        }}
      />

      <Button
        icon={<Plus size={20} />}
        disabled={readOnly || doc.workouts.length >= 7}
        onClick={() => {
          change(addWorkout(doc, crypto.randomUUID()));
        }}
      >
        {T.addWorkout}
      </Button>

      {issues.length > 0 ? (
        <section className={styles.details} aria-labelledby="pendencias">
          <h2 id="pendencias" className={styles.sectionLabel}>
            {T.issuesTitle}
          </h2>
          <ul className={styles.list}>
            {issues.map((message, index) => (
              <li key={index}>
                {message.workoutId ? (
                  <button
                    type="button"
                    className={styles.linkButton}
                    onClick={() => {
                      goTo(message);
                    }}
                  >
                    {message.text}
                  </button>
                ) : (
                  message.text
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className={styles.row}>
        <Button variant="primary" size="lg" disabled={readOnly} onClick={requestPublish}>
          {T.publish}
        </Button>
        <Button
          variant="danger"
          disabled={readOnly}
          onClick={() => {
            setConfirm("discard");
          }}
        >
          {T.discardDraft}
        </Button>
      </div>

      <Dialog
        open={confirm === "publish"}
        title={T.publishTitle}
        confirmLabel={T.publish}
        onCancel={() => {
          setConfirm(null);
        }}
        onConfirm={() => void publish()}
      >
        <p>{T.publishBody}</p>
      </Dialog>
      <Dialog
        open={confirm === "discard"}
        title={TEXTS.program.discardTitle}
        confirmLabel={TEXTS.program.discard}
        destructive
        onCancel={() => {
          setConfirm(null);
        }}
        onConfirm={() => void discard()}
      >
        <p>{TEXTS.program.discardBody(doc.name)}</p>
      </Dialog>

      <ExercisePicker
        open={picker !== null}
        catalog={catalog}
        current={picker?.swapItem ? byId.get(picker.swapItem.exercise_id) : undefined}
        onClose={() => {
          setPicker(null);
        }}
        onPick={pick}
      />
      <ItemSheet
        editing={editing}
        exerciseName={editing ? nameOf(editing.item.exercise_id) : ""}
        onClose={() => {
          setEditing(null);
        }}
        onSwap={() => {
          if (editing) setPicker({ workoutId: editing.workoutId, swapItem: editing.item });
          setEditing(null);
        }}
        onSave={(item) => {
          if (editing) change(updateItem(doc, editing.workoutId, item));
          setEditing(null);
        }}
      />
    </div>
  );
}

// ---------- Treinos e exercícios (arrastar ou subir/descer — UX-07, acessível) ----------

function WorkoutList({
  doc,
  readOnly,
  nameOf,
  regenerating,
  summaries,
  onRegenerate,
  onChange,
  onAddExercise,
  onEditItem,
  onRemoveItem,
}: {
  doc: EditorDocument;
  readOnly: boolean;
  nameOf: (id: string) => string;
  regenerating: string | null;
  summaries: Readonly<Record<string, RegenerationSummary>>;
  onRegenerate: (workoutId: string) => void;
  onChange: (doc: EditorDocument) => void;
  onAddExercise: (workoutId: string) => void;
  onEditItem: (workoutId: string, item: EditorItem) => void;
  onRemoveItem: (workoutId: string, item: EditorItem) => void;
}) {
  const drag = useRef<{ kind: "workout" | "item"; workoutId: string; index: number } | null>(null);

  const onDrop =
    (kind: "workout" | "item", workoutId: string, index: number) => (event: DragEvent) => {
      event.preventDefault();
      const source = drag.current;
      drag.current = null;
      if (source?.kind !== kind) return;
      if (kind === "workout") onChange(moveWorkout(doc, source.index, index));
      else if (source.workoutId === workoutId)
        onChange(moveItem(doc, workoutId, source.index, index));
    };
  const allowDrop = (event: DragEvent) => {
    event.preventDefault();
  };

  return (
    <ol className={styles.list}>
      {doc.workouts.map((workout, wIndex) => (
        // Arrastar é atalho de mouse; o caminho acessível são os botões subir/descer (UX-07).
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <li
          key={workout.id}
          id={`workout-${workout.id}`}
          tabIndex={-1}
          className={styles.workoutCard}
          onDragOver={allowDrop}
          onDrop={onDrop("workout", workout.id, wIndex)}
        >
          <div className={styles.workoutHeader}>
            <span
              className={styles.dragHandle}
              draggable={!readOnly}
              aria-hidden="true"
              onDragStart={() => {
                drag.current = { kind: "workout", workoutId: workout.id, index: wIndex };
              }}
            >
              <GripVertical size={20} />
            </span>
            <FormField label={T.workoutName}>
              {(control) => (
                <TextInput
                  {...control}
                  maxLength={60}
                  value={workout.name}
                  disabled={readOnly}
                  onChange={(e) => {
                    onChange(renameWorkout(doc, workout.id, e.target.value));
                  }}
                />
              )}
            </FormField>
            <IconButton
              label={T.moveUp(workout.name)}
              icon={<ArrowUp size={20} />}
              disabled={readOnly || wIndex === 0}
              onClick={() => {
                onChange(moveWorkout(doc, wIndex, wIndex - 1));
              }}
            />
            <IconButton
              label={T.moveDown(workout.name)}
              icon={<ArrowDown size={20} />}
              disabled={readOnly || wIndex === doc.workouts.length - 1}
              onClick={() => {
                onChange(moveWorkout(doc, wIndex, wIndex + 1));
              }}
            />
            <IconButton
              label={T.remove(workout.name)}
              icon={<Trash2 size={20} />}
              disabled={readOnly}
              onClick={() => {
                onChange(removeWorkout(doc, workout.id));
              }}
            />
          </div>

          {workout.items.length === 0 ? <p className={styles.muted}>{T.emptyWorkout}</p> : null}
          <ol className={styles.list} aria-label={workout.name}>
            {workout.items.map((item, index) => {
              const name = nameOf(item.exercise_id);
              return (
                // Arrastar é atalho de mouse; o caminho acessível são os botões subir/descer.
                // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
                <li
                  key={item.id}
                  id={`item-${item.id}`}
                  tabIndex={-1}
                  className={styles.itemRow}
                  onDragOver={allowDrop}
                  onDrop={onDrop("item", workout.id, index)}
                >
                  <span
                    className={styles.dragHandle}
                    draggable={!readOnly}
                    aria-hidden="true"
                    onDragStart={(event) => {
                      event.stopPropagation();
                      drag.current = { kind: "item", workoutId: workout.id, index };
                    }}
                  >
                    <GripVertical size={20} />
                  </span>
                  <span className={styles.listText}>
                    <span>{name}</span>
                    <span className={styles.muted}>{itemSummary(item)}</span>
                  </span>
                  <IconButton
                    label={T.edit(name)}
                    icon={<Pencil size={20} />}
                    disabled={readOnly}
                    onClick={() => {
                      onEditItem(workout.id, item);
                    }}
                  />
                  <IconButton
                    label={T.moveUp(name)}
                    icon={<ArrowUp size={20} />}
                    disabled={readOnly || index === 0}
                    onClick={() => {
                      onChange(moveItem(doc, workout.id, index, index - 1));
                    }}
                  />
                  <IconButton
                    label={T.moveDown(name)}
                    icon={<ArrowDown size={20} />}
                    disabled={readOnly || index === workout.items.length - 1}
                    onClick={() => {
                      onChange(moveItem(doc, workout.id, index, index + 1));
                    }}
                  />
                  <IconButton
                    label={T.remove(name)}
                    icon={<Trash2 size={20} />}
                    disabled={readOnly}
                    onClick={() => {
                      onRemoveItem(workout.id, item);
                    }}
                  />
                </li>
              );
            })}
          </ol>
          <Button
            variant="ghost"
            icon={<Plus size={20} />}
            disabled={readOnly}
            onClick={() => {
              onAddExercise(workout.id);
            }}
          >
            {T.addExercise}
          </Button>
          {workout.items.length > 0 ? (
            <Button
              variant="ghost"
              icon={<Sparkles size={20} />}
              disabled={readOnly || regenerating !== null}
              loading={regenerating === workout.id}
              onClick={() => {
                onRegenerate(workout.id);
              }}
            >
              {T.regenerate(workout.name)}
            </Button>
          ) : null}
          <RegenerationNote summary={summaries[workout.id]} />
        </li>
      ))}
    </ol>
  );
}

// ---------- TELA-033 — Escolher exercício (alternativas primeiro ao trocar — RF-024) ----------

function ExercisePicker({
  open,
  catalog,
  current,
  onClose,
  onPick,
}: {
  open: boolean;
  catalog: readonly CatalogExercise[];
  current: CatalogExercise | undefined;
  onClose: () => void;
  onPick: (exercise: CatalogExercise) => void;
}) {
  const [query, setQuery] = useState("");
  const results = filterCatalog(catalog, { ...NO_FILTERS, query });
  const alternatives = current ? suggestAlternatives(catalog, current) : [];
  const row = (exercise: CatalogExercise) => (
    <li key={exercise.id}>
      <button
        type="button"
        className={styles.listLink}
        onClick={() => {
          setQuery("");
          onPick(exercise);
        }}
      >
        <span className={styles.listText}>
          <span>{exercise.name}</span>
          <span className={styles.muted}>
            {[
              exercise.primary.map((m) => MUSCLE_GROUP_LABELS[m]).join(", "),
              exercise.equipment.map((q) => EQUIPMENT_LABELS[q]).join(", "),
            ].join(" · ")}
          </span>
        </span>
      </button>
    </li>
  );
  return (
    <Sheet open={open} title={TEXTS.picker.title} onClose={onClose}>
      <FormField label={TEXTS.catalog.search}>
        {(control) => (
          <TextInput
            {...control}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
          />
        )}
      </FormField>
      {alternatives.length > 0 && query === "" ? (
        <section>
          <h3 className={styles.sectionLabel}>{TEXTS.picker.alternatives}</h3>
          <ul className={styles.list} aria-label={TEXTS.picker.alternatives}>
            {alternatives.map(row)}
          </ul>
        </section>
      ) : null}
      <section>
        <h3 className={styles.sectionLabel}>{TEXTS.picker.all}</h3>
        <ul className={styles.list} aria-label={TEXTS.picker.all}>
          {results.map(row)}
        </ul>
      </section>
      <Button
        variant="ghost"
        icon={<Plus size={20} />}
        onClick={() => {
          navigate("/gestao/catalogo/novo");
        }}
      >
        {TEXTS.picker.create}
      </Button>
    </Sheet>
  );
}

// ---------- TELA-032 — Exercício prescrito (RN-035) ----------

const REST_SHORTCUTS = [30, 60, 90, 120, 180] as const;

function ItemSheet({
  editing,
  exerciseName,
  onClose,
  onSwap,
  onSave,
}: {
  editing: { workoutId: string; item: EditorItem } | null;
  exerciseName: string;
  onClose: () => void;
  onSwap: () => void;
  onSave: (item: EditorItem) => void;
}) {
  return (
    <Sheet open={editing !== null} title={TEXTS.item.title} onClose={onClose}>
      {editing ? (
        <ItemForm
          key={editing.item.id}
          item={editing.item}
          exerciseName={exerciseName}
          onSwap={onSwap}
          onSave={onSave}
        />
      ) : null}
    </Sheet>
  );
}

function ItemForm({
  item,
  exerciseName,
  onSwap,
  onSave,
}: {
  item: EditorItem;
  exerciseName: string;
  onSwap: () => void;
  onSave: (item: EditorItem) => void;
}) {
  const I = TEXTS.item;
  const text = (value: number | null) => (value === null ? "" : String(value).replace(".", ","));
  const [form, setForm] = useState({
    measure: item.measure_type,
    sets: text(item.sets),
    repsMin: text(item.reps_min),
    repsMax: text(item.reps_max),
    duration: text(item.duration_s),
    rest: text(item.rest_s),
    load: text(item.suggested_load_kg),
    notes: item.notes ?? "",
  });
  const [invalid, setInvalid] = useState(false);
  const num = (value: string) => (value.trim() === "" ? null : Number(value.replace(",", ".")));

  function submit() {
    const next: EditorItem = {
      ...item,
      measure_type: form.measure,
      sets: num(form.sets) ?? 0,
      reps_min: form.measure === "reps" ? num(form.repsMin) : null,
      reps_max: form.measure === "reps" ? num(form.repsMax) : null,
      duration_s: form.measure === "duration" ? num(form.duration) : null,
      rest_s: num(form.rest) ?? 0,
      suggested_load_kg: num(form.load),
      notes: form.notes.trim() === "" ? null : form.notes.trim(),
    };
    const valid =
      draftIssues(
        { workouts: [{ id: "w", name: "w", items: [{ ...next, position: 1 }] }] },
        () => true,
      ).length === 0;
    if (!valid) {
      setInvalid(true);
      return;
    }
    onSave(next);
  }

  const field = (key: keyof typeof form, label: string, decimal = false) => (
    <FormField label={label}>
      {(control) => (
        <TextInput
          {...control}
          inputMode={decimal ? "decimal" : "numeric"}
          value={form[key]}
          onChange={(e) => {
            setForm({ ...form, [key]: e.target.value });
          }}
        />
      )}
    </FormField>
  );

  return (
    <form
      className={styles.stack}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className={styles.rowBetween}>
        <p>
          <span className={styles.sectionLabel}>{I.exercise}: </span>
          {exerciseName}
        </p>
        <Button size="sm" onClick={onSwap}>
          {I.swap}
        </Button>
      </div>
      {invalid ? <Banner tone="danger">{I.invalid}</Banner> : null}
      <fieldset className={styles.fieldset}>
        <legend className={styles.sectionLabel}>{I.measure}</legend>
        <div className={styles.row}>
          {(["reps", "duration"] as const).map((measure) => (
            <label key={measure} className={styles.inlineChoice}>
              <input
                type="radio"
                name="medida"
                checked={form.measure === measure}
                onChange={() => {
                  setForm({ ...form, measure });
                }}
              />
              {I.measures[measure]}
            </label>
          ))}
        </div>
      </fieldset>
      {field("sets", I.sets)}
      {form.measure === "reps" ? (
        <div className={styles.filters}>
          {field("repsMin", I.repsMin)}
          {field("repsMax", I.repsMax)}
        </div>
      ) : (
        field("duration", I.duration)
      )}
      {field("rest", I.rest)}
      <div className={styles.row} role="group" aria-label={I.restShortcuts}>
        {REST_SHORTCUTS.map((seconds) => (
          <Button
            key={seconds}
            size="sm"
            aria-pressed={form.rest === String(seconds)}
            onClick={() => {
              setForm({ ...form, rest: String(seconds) });
            }}
          >
            {`${String(seconds)} s`}
          </Button>
        ))}
      </div>
      {field("load", I.load, true)}
      <FormField label={I.notes}>
        {(control) => (
          <textarea
            {...control}
            className={styles.textarea}
            rows={2}
            maxLength={500}
            value={form.notes}
            onChange={(e) => {
              setForm({ ...form, notes: e.target.value });
            }}
          />
        )}
      </FormField>
      <Button type="submit" variant="primary">
        {I.save}
      </Button>
    </form>
  );
}
