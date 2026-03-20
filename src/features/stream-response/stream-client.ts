import { ApiError } from "@/shared/api";
import { parseSseStream } from "./sse-parser";
import { useStreamStore } from "./stream-store";
import type { components } from "@/shared/api";

type SendMessageRequest = components["schemas"]["SendMessageRequest"];

const BASE =
  typeof window !== "undefined" && import.meta.env.DEV
    ? ""
    : import.meta.env.VITE_API_BASE_URL || "";

/**
 * Opens an SSE stream, dispatching events to the stream store.
 * Shared by send, retry, and edit flows.
 */
async function runSseStream(
  url: string,
  init: RequestInit,
  ac: AbortController,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: ac.signal });
  } catch (err) {
    if (ac.signal.aborted) return;
    useStreamStore.getState().onTransportError();
    throw err;
  }

  if (!res.ok) {
    let problem;
    try {
      problem = await res.json();
    } catch {
      problem = {
        type: "about:blank",
        title: res.statusText,
        status: res.status,
        detail: `HTTP ${res.status}`,
        instance: url,
        code: "",
      };
    }
    const error = new ApiError(res.status, problem);
    useStreamStore.getState().onError({
      code: problem.code || problem.title || "",
      message: problem.detail || problem.title || `HTTP ${res.status}`,
    });
    throw error;
  }

  if (!res.body) {
    useStreamStore.getState().onTransportError();
    throw new Error("Response body is null");
  }

  try {
    for await (const event of parseSseStream(res.body, ac.signal)) {
      const s = useStreamStore.getState();

      switch (event.type) {
        case "stream_started":
          s.onStreamStarted(event.data.message_id);
          break;
        case "ping":
          break;
        case "delta":
          s.onDelta(event.data.content);
          break;
        case "tool":
          s.onTool(event.data);
          break;
        case "citations":
          s.onCitations(event.data.items);
          break;
        case "done":
          s.onDone(event.data);
          return;
        case "error":
          s.onError(event.data);
          return;
      }
    }

    const current = useStreamStore.getState().activeTurn;
    if (current && current.phase === "streaming") {
      useStreamStore.getState().onTransportError();
    }
  } catch (err) {
    if (ac.signal.aborted) return;
    useStreamStore.getState().onTransportError();
    throw err;
  }
}

/** Send a new message and stream the response. */
export async function streamChatTurn(
  chatId: string,
  body: SendMessageRequest,
): Promise<void> {
  const ac = useStreamStore.getState().startTurn(chatId, body.request_id ?? "");
  return runSseStream(
    `${BASE}/v1/chats/${chatId}/messages:stream`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(body),
    },
    ac,
  );
}

/** Retry the last turn — server reuses original user message. */
export async function retryTurn(
  chatId: string,
  requestId: string,
): Promise<void> {
  const ac = useStreamStore.getState().startTurn(chatId, requestId);
  return runSseStream(
    `${BASE}/v1/chats/${chatId}/turns/${requestId}/retry`,
    {
      method: "POST",
      headers: { Accept: "text/event-stream" },
    },
    ac,
  );
}

/** Edit the last user turn and stream a new response. */
export async function editTurn(
  chatId: string,
  requestId: string,
  content: string,
): Promise<void> {
  const ac = useStreamStore.getState().startTurn(chatId, requestId);
  return runSseStream(
    `${BASE}/v1/chats/${chatId}/turns/${requestId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ content }),
    },
    ac,
  );
}
