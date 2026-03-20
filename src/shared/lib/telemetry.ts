import type { ErrorUiInfo } from "./error-messages";
import type { SseDone } from "@/features/stream-response/sse-types";

export type ErrorEvent = {
  kind: "pre_stream" | "mid_stream" | "post_disconnect";
  code: string;
  category: ErrorUiInfo["category"];
  retryable: boolean;
};

export type StreamOutcomeEvent = {
  outcome: "completed" | "cancelled" | "error" | "transport_error";
  effectiveModel?: string;
  quotaDecision?: string;
  durationMs?: number;
};

const listeners: Array<(event: ErrorEvent | StreamOutcomeEvent) => void> = [];

export function onTelemetry(
  fn: (event: ErrorEvent | StreamOutcomeEvent) => void,
): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

function emit(event: ErrorEvent | StreamOutcomeEvent) {
  for (const fn of listeners) {
    try {
      fn(event);
    } catch {
      // telemetry must never break the app
    }
  }
}

export function trackError(
  kind: ErrorEvent["kind"],
  code: string,
  info: ErrorUiInfo,
) {
  emit({
    kind,
    code,
    category: info.category,
    retryable: info.retryable,
  });
}

export function trackStreamOutcome(
  outcome: StreamOutcomeEvent["outcome"],
  done?: SseDone | null,
  durationMs?: number,
) {
  emit({
    outcome,
    effectiveModel: done?.effective_model,
    quotaDecision: done?.quota_decision,
    durationMs,
  });
}

if (import.meta.env.DEV) {
  onTelemetry((event) => {
    console.debug("[telemetry]", event);
  });
}
