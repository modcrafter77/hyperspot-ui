import type { SseEvent } from "./sse-types";

/**
 * Parses a ReadableStream<Uint8Array> as text/event-stream and yields typed SseEvents.
 * Handles multi-line data fields and ignores comment lines.
 */
export async function* parseSseStream(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<SseEvent> {
  const decoder = new TextDecoderStream();
  const readable = body.pipeThrough(decoder as unknown as TransformStream<Uint8Array, string>);
  const reader = readable.getReader();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) return;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += value;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      let eventType = "";
      let dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith(":")) continue;

        if (line.startsWith("event:")) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trimStart());
        } else if (line === "") {
          if (eventType && dataLines.length > 0) {
            const rawData = dataLines.join("\n");
            const event = parseEvent(eventType, rawData);
            if (event) yield event;
          }
          eventType = "";
          dataLines = [];
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseEvent(eventType: string, rawData: string): SseEvent | null {
  try {
    const data = JSON.parse(rawData);

    switch (eventType) {
      case "stream_started":
        return { type: "stream_started", data };
      case "ping":
        return { type: "ping", data };
      case "delta":
        return { type: "delta", data };
      case "tool":
        return { type: "tool", data };
      case "citations":
        return { type: "citations", data };
      case "done":
        return { type: "done", data };
      case "error":
        return { type: "error", data };
      default:
        return null;
    }
  } catch {
    return null;
  }
}
