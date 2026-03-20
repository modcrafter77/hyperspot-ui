import { create } from "zustand";

type AppState = {
  selectedChatId: string | null;
  sidebarOpen: boolean;
  sidebarWidth: number;
  chatSearchFilter: string;
};

type AppActions = {
  selectChat: (id: string | null) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (w: number) => void;
  setChatSearchFilter: (f: string) => void;
};

export const useAppStore = create<AppState & AppActions>((set) => ({
  selectedChatId: null,
  sidebarOpen: true,
  sidebarWidth: 280,
  chatSearchFilter: "",

  selectChat: (id) => set({ selectedChatId: id }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarWidth: (w) => set({ sidebarWidth: w }),
  setChatSearchFilter: (f) => set({ chatSearchFilter: f }),
}));
