import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { createChat, updateChatTitle, deleteChat } from "./api";
import type { Chat, ChatDetail, ChatsPage, CreateChatRequest } from "./types";
import { toast } from "sonner";
import { ApiError } from "@/shared/api";

export function useCreateChat() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateChatRequest) => createChat(body),
    onSuccess: (newChat: Chat) => {
      qc.invalidateQueries({ queryKey: queryKeys.chats.all });
      qc.setQueryData(queryKeys.chats.detail(newChat.id), {
        ...newChat,
        message_count: 0,
      } satisfies ChatDetail);
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError ? err.message : "Failed to create chat";
      toast.error(msg);
    },
  });
}

export function useRenameChatTitle() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      updateChatTitle(id, { title }),

    onMutate: async ({ id, title }) => {
      await qc.cancelQueries({ queryKey: queryKeys.chats.all });
      await qc.cancelQueries({ queryKey: queryKeys.chats.detail(id) });

      const prevDetail = qc.getQueryData<ChatDetail>(
        queryKeys.chats.detail(id),
      );
      const prevList = qc.getQueryData<InfiniteData<ChatsPage>>(
        queryKeys.chats.list(),
      );

      if (prevDetail) {
        qc.setQueryData(queryKeys.chats.detail(id), {
          ...prevDetail,
          title,
          updated_at: new Date().toISOString(),
        });
      }

      if (prevList) {
        qc.setQueryData<InfiniteData<ChatsPage>>(
          queryKeys.chats.list(),
          {
            ...prevList,
            pages: prevList.pages.map((page) => ({
              ...page,
              items: page.items.map((c) =>
                c.id === id
                  ? { ...c, title, updated_at: new Date().toISOString() }
                  : c,
              ),
            })),
          },
        );
      }

      return { prevDetail, prevList };
    },

    onError: (err, { id }, ctx) => {
      if (ctx?.prevDetail) {
        qc.setQueryData(queryKeys.chats.detail(id), ctx.prevDetail);
      }
      if (ctx?.prevList) {
        qc.setQueryData(queryKeys.chats.list(), ctx.prevList);
      }
      const msg =
        err instanceof ApiError ? err.message : "Failed to rename chat";
      toast.error(msg);
    },

    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.chats.all });
      qc.invalidateQueries({ queryKey: queryKeys.chats.detail(id) });
    },
  });
}

export function useDeleteChat() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteChat(id),

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.chats.all });

      const prevList = qc.getQueryData<InfiniteData<ChatsPage>>(
        queryKeys.chats.list(),
      );

      if (prevList) {
        qc.setQueryData<InfiniteData<ChatsPage>>(
          queryKeys.chats.list(),
          {
            ...prevList,
            pages: prevList.pages.map((page) => ({
              ...page,
              items: page.items.filter((c) => c.id !== id),
            })),
          },
        );
      }

      return { prevList };
    },

    onError: (err, _id, ctx) => {
      if (ctx?.prevList) {
        qc.setQueryData(queryKeys.chats.list(), ctx.prevList);
      }
      const msg =
        err instanceof ApiError ? err.message : "Failed to delete chat";
      toast.error(msg);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.chats.all });
    },
  });
}
