import { create } from "zustand";

export type ReasoningEntry = {
  text: string;
  durationMs: number;
};

type ReasoningState = {
  entries: Record<string, ReasoningEntry>;
  setEntry: (messageId: string, entry: ReasoningEntry) => void;
};

/**
 * Persists model reasoning keyed by assistant message ID.
 * Populated when a streaming turn completes; read by MessageBubble
 * to show "Thought for Xs" on historical messages.
 */
export const useReasoningStore = create<ReasoningState>((set) => ({
  entries: {},
  setEntry: (messageId, entry) =>
    set((s) => ({ entries: { ...s.entries, [messageId]: entry } })),
}));
