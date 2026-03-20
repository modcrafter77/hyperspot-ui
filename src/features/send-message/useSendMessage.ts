import { useCallback } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { streamChatTurn } from "@/features/stream-response/stream-client";
import { useStreamStore } from "@/features/stream-response/stream-store";
import { useAttachmentStore } from "@/features/attachments/attachment-store";
import { toast } from "sonner";
import { ApiError } from "@/shared/api";
import type { MessagesPage, Message } from "@/entities/message";

export function useSendMessage(chatId: string) {
  const qc = useQueryClient();

  const send = useCallback(
    async (
      content: string,
      opts?: { webSearch?: boolean; attachmentIds?: string[] },
    ) => {
      const requestId = crypto.randomUUID();
      const attachmentIds = opts?.attachmentIds;

      const optimisticMsg: Message = {
        id: `optimistic-${requestId}`,
        request_id: requestId,
        role: "user",
        content,
        model: null,
        input_tokens: null,
        output_tokens: null,
        attachments: [],
        my_reaction: null,
        created_at: new Date().toISOString(),
      };

      qc.setQueryData<InfiniteData<MessagesPage>>(
        queryKeys.messages.list(chatId),
        (old) => {
          if (!old) return old;
          const firstPage = old.pages[0];
          if (!firstPage) return old;
          return {
            ...old,
            pages: [
              { ...firstPage, items: [optimisticMsg, ...firstPage.items] },
              ...old.pages.slice(1),
            ],
          };
        },
      );

      if (attachmentIds && attachmentIds.length > 0) {
        useAttachmentStore.getState().clearChat(chatId);
      }

      try {
        await streamChatTurn(chatId, {
          content,
          request_id: requestId,
          attachment_ids: attachmentIds,
          web_search: opts?.webSearch ? { enabled: true } : undefined,
        });
      } catch (err) {
        if (err instanceof ApiError) {
          toast.error(err.message);
        } else if (err instanceof TypeError) {
          toast.error("Network error — is the backend running?");
        }
        return;
      }

      // Only invalidate after a successful stream (done) or a server-side
      // SSE error (the server DID process the request, so cache is stale).
      // Transport errors (network down) mean nothing changed on the server.
      const turn = useStreamStore.getState().activeTurn;
      if (turn && (turn.phase === "done" || turn.phase === "error")) {
        await Promise.all([
          qc.invalidateQueries({ queryKey: queryKeys.messages.list(chatId) }),
          qc.invalidateQueries({ queryKey: queryKeys.chats.detail(chatId) }),
          qc.invalidateQueries({ queryKey: queryKeys.chats.all }),
          qc.invalidateQueries({ queryKey: queryKeys.quota.status() }),
        ]);
        useStreamStore.getState().clearTurn();
      }
    },
    [chatId, qc],
  );

  const cancel = useCallback(() => {
    useStreamStore.getState().cancelTurn();
  }, []);

  return { send, cancel };
}
