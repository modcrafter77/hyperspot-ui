import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { savePreference, type Preferences } from "@/shared/lib/preferences";

type AppState = {
  selectedChatId: string | null;
  sidebarOpen: boolean;
  sidebarWidth: number;
  chatSearchFilter: string;
  commandPaletteOpen: boolean;
  settingsOpen: boolean;
  serverUrl: string;
  hydrated: boolean;
};

type AppActions = {
  selectChat: (id: string | null) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (w: number) => void;
  setChatSearchFilter: (f: string) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setServerUrl: (url: string) => void;
  hydrate: (prefs: Preferences) => void;
};

export const useAppStore = create<AppState & AppActions>()(
  subscribeWithSelector((set) => ({
    selectedChatId: null,
    sidebarOpen: true,
    sidebarWidth: 280,
    chatSearchFilter: "",
    commandPaletteOpen: false,
    settingsOpen: false,
    serverUrl: "",
    hydrated: false,

    selectChat: (id) => set({ selectedChatId: id }),
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    setSidebarWidth: (w) => set({ sidebarWidth: w }),
    setChatSearchFilter: (f) => set({ chatSearchFilter: f }),
    setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    setSettingsOpen: (open) => set({ settingsOpen: open }),
    setServerUrl: (url) => set({ serverUrl: url }),
    hydrate: (prefs) =>
      set({
        sidebarOpen: prefs.sidebarOpen,
        sidebarWidth: prefs.sidebarWidth,
        selectedChatId: prefs.lastChatId,
        serverUrl: prefs.serverUrl,
        hydrated: true,
      }),
  })),
);

useAppStore.subscribe(
  (s) => s.sidebarOpen,
  (open) => savePreference("sidebarOpen", open),
);

useAppStore.subscribe(
  (s) => s.sidebarWidth,
  (w) => savePreference("sidebarWidth", w),
);

useAppStore.subscribe(
  (s) => s.selectedChatId,
  (id) => savePreference("lastChatId", id),
);

useAppStore.subscribe(
  (s) => s.serverUrl,
  (url) => savePreference("serverUrl", url),
);
