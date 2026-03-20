import { useCallback } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { setReaction, removeReaction } from "@/entities/reaction/api";
import { toast } from "sonner";
import type { MessagesPage, Message } from "@/entities/message";

export function useReaction(chatId: string) {
  const qc = useQueryClient();

  const updateMessageInCache = useCallback(
    (messageId: string, reaction: "like" | "dislike" | null) => {
      qc.setQueryData<InfiniteData<MessagesPage>>(
        queryKeys.messages.list(chatId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((msg: Message) =>
                msg.id === messageId
                  ? { ...msg, my_reaction: reaction }
                  : msg,
              ),
            })),
          };
        },
      );
    },
    [chatId, qc],
  );

  const toggleReaction = useCallback(
    async (messageId: string, reaction: "like" | "dislike", current: "like" | "dislike" | null) => {
      if (current === reaction) {
        updateMessageInCache(messageId, null);
        try {
          await removeReaction(chatId, messageId);
        } catch (err) {
          updateMessageInCache(messageId, current);
          toast.error(err instanceof Error ? err.message : "Failed to remove reaction");
        }
      } else {
        updateMessageInCache(messageId, reaction);
        try {
          await setReaction(chatId, messageId, reaction);
        } catch (err) {
          updateMessageInCache(messageId, current);
          toast.error(err instanceof Error ? err.message : "Failed to set reaction");
        }
      }
    },
    [chatId, updateMessageInCache],
  );

  return { toggleReaction };
}
