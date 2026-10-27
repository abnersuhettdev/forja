import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import styles from "./Feedback.module.css";

// UX-06 §6: confirmação breve de 5 s, uma por vez, com "Desfazer" quando reversível; região viva.
interface SnackbarMessage {
  text: string;
  action?: { label: string; onAction: () => void };
}

const DURATION_MS = 5000;
const SnackbarContext = createContext<(message: SnackbarMessage) => void>(() => undefined);

export function useSnackbar() {
  return useContext(SnackbarContext);
}

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<(SnackbarMessage & { key: number }) | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((message: SnackbarMessage) => {
    window.clearTimeout(timer.current);
    setCurrent({ ...message, key: Date.now() });
    timer.current = window.setTimeout(() => {
      setCurrent(null);
    }, DURATION_MS);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );

  return (
    <SnackbarContext.Provider value={show}>
      {children}
      <div className={styles.snackbarRegion} role="status" aria-live="polite">
        {current ? (
          <div key={current.key} className={styles.snackbar}>
            <span>{current.text}</span>
            {current.action ? (
              <button
                type="button"
                className={styles.snackbarAction}
                onClick={() => {
                  current.action?.onAction();
                  setCurrent(null);
                }}
              >
                {current.action.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </SnackbarContext.Provider>
  );
}
