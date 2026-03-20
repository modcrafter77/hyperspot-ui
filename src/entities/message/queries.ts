import {
  useInfiniteQuery,
  type InfiniteData,
} from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { listMessages } from "./api";
import type { MessagesPage } from "./types";

const MESSAGES_PAGE_SIZE = 50;

export function useMessagesInfinite(chatId: string) {
  return useInfiniteQuery<
    MessagesPage,
    Error,
    InfiniteData<MessagesPage>,
    ReturnType<typeof queryKeys.messages.list>,
    string | undefined
  >({
    queryKey: queryKeys.messages.list(chatId),
    queryFn: ({ pageParam }) =>
      listMessages(chatId, {
        limit: MESSAGES_PAGE_SIZE,
        cursor: pageParam,
        orderby: "created_at desc",
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.page_info.next_cursor ?? undefined,
    enabled: !!chatId,
  });
}
