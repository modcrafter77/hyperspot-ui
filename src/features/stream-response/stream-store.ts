import { create } from "zustand";
import type {
  TurnPhase,
  SseTool,
  SseDone,
  SseError,
  CitationItem,
} from "./sse-types";

export type ActiveTurn = {
  chatId: string;
  requestId: string;
  assistantMessageId: string | null;
  phase: TurnPhase;
  partialText: string;
  tools: SseTool[];
  citations: CitationItem[];
  doneData: SseDone | null;
  errorData: SseError | null;
};

type StreamState = {
  activeTurn: ActiveTurn | null;
  abortController: AbortController | null;
};

type StreamActions = {
  startTurn: (chatId: string, requestId: string) => AbortController;
  onStreamStarted: (messageId: string) => void;
  onDelta: (content: string) => void;
  onTool: (tool: SseTool) => void;
  onCitations: (items: CitationItem[]) => void;
  onDone: (data: SseDone) => void;
  onError: (data: SseError) => void;
  onTransportError: () => void;
  cancelTurn: () => void;
  clearTurn: () => void;
};

export const useStreamStore = create<StreamState & StreamActions>(
  (set, get) => ({
    activeTurn: null,
    abortController: null,

    startTurn: (chatId, requestId) => {
      const prev = get().abortController;
      if (prev) prev.abort();

      const ac = new AbortController();
      set({
        abortController: ac,
        activeTurn: {
          chatId,
          requestId,
          assistantMessageId: null,
          phase: "opening",
          partialText: "",
          tools: [],
          citations: [],
          doneData: null,
          errorData: null,
        },
      });
      return ac;
    },

    onStreamStarted: (messageId) => {
      set((s) => {
        if (!s.activeTurn) return s;
        return {
          activeTurn: {
            ...s.activeTurn,
            assistantMessageId: messageId,
            phase: "streaming",
          },
        };
      });
    },

    onDelta: (content) => {
      set((s) => {
        if (!s.activeTurn) return s;
        return {
          activeTurn: {
            ...s.activeTurn,
            partialText: s.activeTurn.partialText + content,
          },
        };
      });
    },

    onTool: (tool) => {
      set((s) => {
        if (!s.activeTurn) return s;
        const tools = [...s.activeTurn.tools];
        const existing = tools.findIndex(
          (t) => t.name === tool.name && t.phase !== "done",
        );
        if (existing >= 0) {
          tools[existing] = tool;
        } else {
          tools.push(tool);
        }
        return { activeTurn: { ...s.activeTurn, tools } };
      });
    },

    onCitations: (items) => {
      set((s) => {
        if (!s.activeTurn) return s;
        return {
          activeTurn: { ...s.activeTurn, citations: items },
        };
      });
    },

    onDone: (data) => {
      set((s) => {
        if (!s.activeTurn) return s;
        return {
          activeTurn: {
            ...s.activeTurn,
            phase: "done",
            doneData: data,
          },
          abortController: null,
        };
      });
    },

    onError: (data) => {
      set((s) => {
        if (!s.activeTurn) return s;
        return {
          activeTurn: {
            ...s.activeTurn,
            phase: "error",
            errorData: data,
          },
          abortController: null,
        };
      });
    },

    onTransportError: () => {
      set((s) => {
        if (!s.activeTurn) return s;
        return {
          activeTurn: { ...s.activeTurn, phase: "recovering" },
          abortController: null,
        };
      });
    },

    cancelTurn: () => {
      const ac = get().abortController;
      if (ac) ac.abort();
      set((s) => {
        if (!s.activeTurn) return s;
        return {
          activeTurn: { ...s.activeTurn, phase: "cancelled" },
          abortController: null,
        };
      });
    },

    clearTurn: () => {
      set({ activeTurn: null, abortController: null });
    },
  }),
);
