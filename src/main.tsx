import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { configureApi } from "./shared/api";
import "./index.css";

configureApi({
  baseUrl: import.meta.env.DEV
    ? ""
    : import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8087/cf/mini-chat",
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
