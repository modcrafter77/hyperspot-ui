import { useEffect } from "react";
import { isTauri } from "@/shared/lib/tauri";

const APP_NAME = "Hyperspot Chat";

export function useWindowTitle(chatTitle: string | null | undefined) {
  useEffect(() => {
    const title = chatTitle ? `${chatTitle} — ${APP_NAME}` : APP_NAME;
    document.title = title;

    if (isTauri) {
      import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
        getCurrentWindow().setTitle(title).catch(() => {});
      });
    }
  }, [chatTitle]);
}
