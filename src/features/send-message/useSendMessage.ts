import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useStreamStore } from "@/features/stream-response/stream-store";
import { trackStreamOutcome } from "@/shared/lib/telemetry";
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

  const cancel = useCallback(() => {
    trackStreamOutcome("cancelled");
    useStreamStore.getState().cancelTurn();
  }, []);

  return { send, cancel };
}
