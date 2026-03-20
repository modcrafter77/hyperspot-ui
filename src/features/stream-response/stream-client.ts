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
 * Sends a message and processes the SSE stream, dispatching events to the stream store.
 * Returns a promise that resolves when the stream terminates (done/error) or rejects on pre-stream failure.
 */
export async function streamChatTurn(
  chatId: string,
  body: SendMessageRequest,
): Promise<void> {
  const store = useStreamStore.getState();
  const ac = store.startTurn(chatId, body.request_id ?? "");

  const url = `${BASE}/v1/chats/${chatId}/messages:stream`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
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
    // Normalize Problem Details to simple { code, message } for the stream store
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

    // Stream ended without terminal event — treat as transport error
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
