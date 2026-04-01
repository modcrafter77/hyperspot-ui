import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { applyServerUrl } from "./shared/api";
import { loadPreferences } from "./shared/lib/preferences";
import { useAppStore } from "./app/store";
import "./index.css";

async function bootstrap() {
  const prefs = await loadPreferences();
  useAppStore.getState().hydrate(prefs);
  applyServerUrl(prefs.serverUrl);

  if (!import.meta.env.DEV && !prefs.serverUrl) {
    useAppStore.getState().setSettingsOpen(true);
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrap();
