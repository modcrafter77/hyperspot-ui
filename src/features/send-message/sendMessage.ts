import { type QueryClient, type InfiniteData } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { streamChatTurn } from "@/features/stream-response/stream-client";
import { useStreamStore } from "@/features/stream-response/stream-store";
import { useAttachmentStore } from "@/features/attachments/attachment-store";
import { toast } from "sonner";
import { ApiError } from "@/shared/api";
import { mapApiError, mapNetworkError } from "@/shared/lib/error-messages";
import { trackError, trackStreamOutcome } from "@/shared/lib/telemetry";
import type { MessagesPage, Message } from "@/entities/message";

export async function sendMessage(
  chatId: string,
  content: string,
  opts: { webSearch?: boolean; attachmentIds?: string[] } | undefined,
  qc: QueryClient,
): Promise<void> {
  const requestId = crypto.randomUUID();
  const attachmentIds = opts?.attachmentIds;
  const t0 = Date.now();

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
      if (!old) {
        return {
          pages: [{ items: [optimisticMsg], page_info: { has_more: false, next_cursor: null } }],
          pageParams: [undefined],
        };
      }
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
      const info = mapApiError(err);
      trackError("pre_stream", err.code, info);
      toast.error(info.title, { description: info.detail });
    } else if (err instanceof TypeError) {
      const info = mapNetworkError();
      trackError("pre_stream", "network_error", info);
      toast.error(info.title, { description: info.detail });
    }
    // Pre-stream errors mean the server never created a turn.
    // Revert the optimistic message immediately and clear the turn.
    useStreamStore.getState().clearTurn();
    qc.setQueryData<InfiniteData<MessagesPage>>(
      queryKeys.messages.list(chatId),
      (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.filter((m) => m.id !== optimisticMsg.id),
          })),
        };
      },
    );
    await qc.invalidateQueries({ queryKey: queryKeys.messages.list(chatId) });
    return;
  }

  const turn = useStreamStore.getState().activeTurn;
  if (turn) {
    const elapsed = Date.now() - t0;
    if (turn.phase === "done") {
      trackStreamOutcome("completed", turn.doneData, elapsed);
    } else if (turn.phase === "error") {
      trackStreamOutcome("error", null, elapsed);
    } else if (turn.phase === "cancelled") {
      trackStreamOutcome("cancelled", null, elapsed);
    }
  }

  const isTerminal =
    turn &&
    (turn.phase === "done" ||
      turn.phase === "error" ||
      turn.phase === "cancelled");

  if (isTerminal) {
    // Surface quota warnings via toast before clearing the turn.
    if (turn.phase === "done" && turn.doneData) {
      const d = turn.doneData;
      if (d.quota_decision === "downgrade" && d.downgrade_from) {
        toast.warning(`Model downgraded from ${d.downgrade_from}`, {
          description: d.downgrade_reason ?? "Quota limit reached",
        });
      }
      d.quota_warnings?.forEach((w) => {
        toast.warning(`${w.tier} ${w.period}: ${w.remaining_percentage}% remaining`);
      });
    }

    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.messages.list(chatId) }),
      // chats.all (["chats"]) uses prefix matching — covers both list and detail.
      qc.invalidateQueries({ queryKey: queryKeys.chats.all }),
      qc.invalidateQueries({ queryKey: queryKeys.quota.status() }),
    ]);

    // For done/cancelled we clear the turn so real messages replace the bubble.
    // For error we leave the bubble visible so the user can see what went wrong
    // and optionally retry; the next startTurn() call will replace it.
    if (turn.phase !== "error") {
      useStreamStore.getState().clearTurn();
    }
  }
}
