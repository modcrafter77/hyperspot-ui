import { useEffect } from "react";
import { useAppStore } from "@/app/store";

export function useGlobalShortcuts() {
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const selectChat = useAppStore((s) => s.selectChat);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      if (mod && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      if (mod && e.key === "n") {
        e.preventDefault();
        selectChat(null);
        return;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [toggleSidebar, selectChat, setCommandPaletteOpen]);
}
