import { fetchJson } from "@/shared/api";
import type { MessagesPage } from "./types";

export type ListMessagesParams = {
  limit?: number;
  cursor?: string;
  orderby?: string;
  filter?: string;
};

export function listMessages(
  chatId: string,
  params?: ListMessagesParams,
): Promise<MessagesPage> {
  const search = new URLSearchParams();
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.cursor) search.set("cursor", params.cursor);
  if (params?.orderby) search.set("$orderby", params.orderby);
  if (params?.filter) search.set("$filter", params.filter);
  const qs = search.toString();
  return fetchJson(`/v1/chats/${chatId}/messages${qs ? `?${qs}` : ""}`);
}
