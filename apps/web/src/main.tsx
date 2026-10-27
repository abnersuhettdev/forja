import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow/700.css";
import "@fontsource/barlow-semi-condensed/600.css";
import "@fontsource/barlow-semi-condensed/700.css";
import "./design/global.css";
import { AppShell } from "./app/AppShell.tsx";
import { SnackbarProvider } from "./components/Snackbar.tsx";
import { applyThemePreference, readThemePreference } from "./design/theme.ts";

applyThemePreference(readThemePreference());

const root = document.getElementById("root");
if (!root) throw new Error("Elemento raiz ausente.");

createRoot(root).render(
  <StrictMode>
    <SnackbarProvider>
      <AppShell />
    </SnackbarProvider>
  </StrictMode>,
);
