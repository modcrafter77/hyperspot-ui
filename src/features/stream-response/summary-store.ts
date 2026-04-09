import { create } from "zustand";
import type { ThreadSummaryInfo } from "./sse-types";

/**
 * Persists the most recent thread summary per chat (in-memory only).
 * Populated from stream_started events; shown as a banner in ChatView.
 */
type SummaryState = {
  /** chatId → latest ThreadSummaryInfo */
  entries: Record<string, ThreadSummaryInfo>;
  set: (chatId: string, info: ThreadSummaryInfo) => void;
  remove: (chatId: string) => void;
};

export const useSummaryStore = create<SummaryState>((set) => ({
  entries: {},
  set: (chatId, info) =>
    set((s) => ({ entries: { ...s.entries, [chatId]: info } })),
  remove: (chatId) =>
    set((s) => {
      const { [chatId]: _, ...rest } = s.entries;
      return { entries: rest };
    }),
}));
