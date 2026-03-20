import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { configureApi } from "./shared/api";
import { loadPreferences } from "./shared/lib/preferences";
import { useAppStore } from "./app/store";
import "./index.css";

function applyServerUrl(serverUrl: string) {
  if (import.meta.env.DEV && !serverUrl) {
    configureApi({ baseUrl: "" });
  } else {
    configureApi({
      baseUrl: serverUrl || import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8087/cf/mini-chat",
    });
  }
}

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

export { applyServerUrl };

bootstrap();
