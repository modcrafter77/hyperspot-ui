import {
  useInfiniteQuery,
  useQuery,
  useSuspenseQuery,
  type InfiniteData,
} from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { listChats, getChat } from "./api";
import type { ChatsPage } from "./types";

const CHATS_PAGE_SIZE = 30;

export function useChatsInfinite(filter?: string) {
  return useInfiniteQuery<
    ChatsPage,
    Error,
    InfiniteData<ChatsPage>,
    ReturnType<typeof queryKeys.chats.list>,
    string | undefined
  >({
    queryKey: queryKeys.chats.list(filter),
    queryFn: ({ pageParam }) =>
      listChats({ limit: CHATS_PAGE_SIZE, cursor: pageParam, filter }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.page_info.next_cursor ?? undefined,
  });
}

export function useChatDetail(chatId: string) {
  return useSuspenseQuery({
    queryKey: queryKeys.chats.detail(chatId),
    queryFn: () => getChat(chatId),
  });
}

/** Non-suspense variant — returns stale data on refetch failure instead of crashing. */
export function useChatDetailSafe(chatId: string) {
  return useQuery({
    queryKey: queryKeys.chats.detail(chatId),
    queryFn: () => getChat(chatId),
    enabled: !!chatId,
  });
}
