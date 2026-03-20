import { fetchJson, fetchDelete } from "@/shared/api";
import type {
  Chat,
  ChatDetail,
  ChatsPage,
  CreateChatRequest,
  UpdateChatRequest,
} from "./types";

export type ListChatsParams = {
  limit?: number;
  cursor?: string;
  filter?: string;
};

export function listChats(params?: ListChatsParams): Promise<ChatsPage> {
  const search = new URLSearchParams();
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.cursor) search.set("cursor", params.cursor);
  if (params?.filter) search.set("$filter", params.filter);
  const qs = search.toString();
  return fetchJson(`/v1/chats${qs ? `?${qs}` : ""}`);
}

export function getChat(id: string): Promise<ChatDetail> {
  return fetchJson(`/v1/chats/${id}`);
}

export function createChat(body: CreateChatRequest): Promise<Chat> {
  return fetchJson("/v1/chats", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateChatTitle(
  id: string,
  body: UpdateChatRequest,
): Promise<ChatDetail> {
  return fetchJson(`/v1/chats/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteChat(id: string): Promise<void> {
  return fetchDelete(`/v1/chats/${id}`);
}
