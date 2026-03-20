import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { deleteTurn } from "@/entities/turn";
import { retryTurn, editTurn } from "@/features/stream-response/stream-client";
import { useStreamStore } from "@/features/stream-response/stream-store";
import { toast } from "sonner";
import { ApiError } from "@/shared/api";

export function useTurnActions(chatId: string) {
  const qc = useQueryClient();

  const invalidateAfterStream = useCallback(async () => {
    const turn = useStreamStore.getState().activeTurn;
    if (
      turn &&
      (turn.phase === "done" ||
        turn.phase === "error" ||
        turn.phase === "cancelled")
    ) {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.messages.list(chatId) }),
        qc.invalidateQueries({ queryKey: queryKeys.chats.all }),
        qc.invalidateQueries({ queryKey: queryKeys.quota.status() }),
      ]);
      if (turn.phase !== "error") {
        useStreamStore.getState().clearTurn();
      }
    }
  }, [chatId, qc]);

  const handleRetry = useCallback(
    async (requestId: string) => {
      try {
        await retryTurn(chatId, requestId);
      } catch (err) {
        useStreamStore.getState().clearTurn();
        if (err instanceof ApiError) {
          toast.error(err.message);
        } else if (err instanceof TypeError) {
          toast.error("Network error — is the backend running?");
        }
        return;
      }
      await invalidateAfterStream();
    },
    [chatId, invalidateAfterStream],
  );

  const handleEdit = useCallback(
    async (requestId: string, content: string) => {
      try {
        await editTurn(chatId, requestId, content);
      } catch (err) {
        useStreamStore.getState().clearTurn();
        if (err instanceof ApiError) {
          toast.error(err.message);
        } else if (err instanceof TypeError) {
          toast.error("Network error — is the backend running?");
        }
        return;
      }
      await invalidateAfterStream();
    },
    [chatId, invalidateAfterStream],
  );

  const handleDelete = useCallback(
    async (requestId: string) => {
      try {
        await deleteTurn(chatId, requestId);
      } catch (err) {
        if (err instanceof ApiError) {
          toast.error(err.message);
        } else if (err instanceof TypeError) {
          toast.error("Network error — is the backend running?");
        }
        return;
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.messages.list(chatId) }),
        qc.invalidateQueries({ queryKey: queryKeys.chats.all }),
      ]);
    },
    [chatId, qc],
  );

  return { handleRetry, handleEdit, handleDelete };
}
