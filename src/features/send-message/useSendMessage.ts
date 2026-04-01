import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useStreamStore } from "@/features/stream-response/stream-store";
import { sendMessage } from "./sendMessage";

export function useSendMessage(chatId: string) {
  const qc = useQueryClient();

  const send = useCallback(
    (
      content: string,
      opts?: { webSearch?: boolean; attachmentIds?: string[] },
    ) => sendMessage(chatId, content, opts, qc),
    [chatId, qc],
  );

  // Do not call trackStreamOutcome here — sendMessage.ts detects the
  // "cancelled" phase after streamChatTurn resolves and tracks it with
  // elapsed-time data. Calling it here would double-count every cancellation.
  const cancel = useCallback(() => {
    useStreamStore.getState().cancelTurn();
  }, []);

  return { send, cancel };
}
