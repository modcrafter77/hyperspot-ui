import type { components } from "@/shared/api";

/** Thread summary metadata sent when the backend compresses older messages. */
export type ThreadSummaryInfo = {
  token_estimate: number;
  messages_compressed?: number;
  frontier_message_id?: string;
  summary_updated_at?: string;
};

// Override: backend sends thread_summary_applied which isn't in the generated schema yet.
export type SseStreamStarted = components["schemas"]["SseStreamStartedEvent"] & {
  thread_summary_applied?: ThreadSummaryInfo;
};
// Override: backend now sends type "text" | "reasoning"; schema only defines "text"
export type SseDelta = { type: "text" | "reasoning"; content: string };
export type SseCitations = components["schemas"]["SseCitationsEvent"];
export type CitationItem = components["schemas"]["CitationItem"];
export type QuotaWarning = components["schemas"]["QuotaWarning"];

// Backend actual SSE tool event — phase is only "start" | "done" (no "progress")
export type SseTool = {
  phase: "start" | "done";
  name: string;
  details?: { files_searched?: number } & Record<string, unknown>;
};

// Backend actual SSE done event — usage has no `model` field
export type SseDone = {
  usage: { input_tokens: number; output_tokens: number } | null;
  effective_model: string;
  selected_model: string;
  quota_decision: "allow" | "downgrade";
  downgrade_from?: string;
  downgrade_reason?: string;
  quota_warnings?: QuotaWarning[];
};

// Backend actual SSE error event — simple { code, message }, NOT full Problem Details
export type SseError = {
  code: string;
  message: string;
};

export type SseEvent =
  | { type: "stream_started"; data: SseStreamStarted }
  | { type: "ping"; data: Record<string, never> }
  | { type: "delta"; data: SseDelta }
  | { type: "tool"; data: SseTool }
  | { type: "citations"; data: SseCitations }
  | { type: "done"; data: SseDone }
  | { type: "error"; data: SseError };

export type TurnPhase =
  | "idle"
  | "opening"
  | "streaming"
  | "done"
  | "error"
  | "cancelled"
  | "recovering";
