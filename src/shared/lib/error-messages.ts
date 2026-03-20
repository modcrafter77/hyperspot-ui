import type { SseError } from "@/features/stream-response/sse-types";
import type { ApiError } from "@/shared/api";

export type ErrorSeverity = "warning" | "error" | "info";

export type ErrorUiInfo = {
  title: string;
  detail: string;
  severity: ErrorSeverity;
  /** Whether the user should be offered a "Retry" affordance. */
  retryable: boolean;
  /** Telemetry category for analytics. */
  category: "quota" | "validation" | "provider" | "infrastructure" | "client" | "unknown";
};

const CODE_MAP: Record<string, Omit<ErrorUiInfo, "detail">> = {
  quota_exceeded: {
    title: "Quota exhausted",
    severity: "warning",
    retryable: false,
    category: "quota",
  },
  quota_overshoot_exceeded: {
    title: "Usage limit exceeded",
    severity: "warning",
    retryable: false,
    category: "quota",
  },
  rate_limited: {
    title: "Rate limited",
    severity: "warning",
    retryable: true,
    category: "provider",
  },
  orphan_timeout: {
    title: "Request timed out",
    severity: "error",
    retryable: true,
    category: "infrastructure",
  },
  provider_error: {
    title: "Provider error",
    severity: "error",
    retryable: true,
    category: "provider",
  },
  provider_timeout: {
    title: "Provider timed out",
    severity: "error",
    retryable: true,
    category: "provider",
  },
  context_budget_exceeded: {
    title: "Context too large",
    severity: "error",
    retryable: false,
    category: "validation",
  },
  image_bytes_exceeded: {
    title: "Image too large",
    severity: "error",
    retryable: false,
    category: "validation",
  },
  file_too_large: {
    title: "File too large",
    severity: "error",
    retryable: false,
    category: "validation",
  },
  unsupported_file_type: {
    title: "Unsupported file type",
    severity: "error",
    retryable: false,
    category: "validation",
  },
  unsupported_media: {
    title: "Model doesn't support images",
    severity: "error",
    retryable: false,
    category: "validation",
  },
  generation_in_progress: {
    title: "Generation already running",
    severity: "warning",
    retryable: false,
    category: "client",
  },
  request_id_conflict: {
    title: "Duplicate request",
    severity: "warning",
    retryable: false,
    category: "client",
  },
  stream_interrupted: {
    title: "Stream interrupted",
    severity: "error",
    retryable: true,
    category: "infrastructure",
  },
  not_latest_turn: {
    title: "Not the latest turn",
    severity: "warning",
    retryable: false,
    category: "client",
  },
  invalid_turn_state: {
    title: "Invalid turn state",
    severity: "warning",
    retryable: false,
    category: "client",
  },
  web_search_disabled: {
    title: "Web search unavailable",
    severity: "warning",
    retryable: false,
    category: "validation",
  },
};

export function mapSseError(err: SseError): ErrorUiInfo {
  const mapped = CODE_MAP[err.code];
  if (mapped) {
    return { ...mapped, detail: err.message };
  }
  return {
    title: err.code || "Error",
    detail: err.message,
    severity: "error",
    retryable: false,
    category: "unknown",
  };
}

export function mapApiError(err: ApiError): ErrorUiInfo {
  const mapped = CODE_MAP[err.code];
  if (mapped) {
    return { ...mapped, detail: err.message };
  }
  return {
    title: err.problem.title || "Error",
    detail: err.message,
    severity: "error",
    retryable: err.status >= 500,
    category: err.status >= 500 ? "infrastructure" : "unknown",
  };
}

export function mapNetworkError(): ErrorUiInfo {
  return {
    title: "Connection lost",
    detail: "Unable to reach the server. Check your network connection.",
    severity: "error",
    retryable: true,
    category: "infrastructure",
  };
}
