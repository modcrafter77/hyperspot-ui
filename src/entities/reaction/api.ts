import { fetchJson, fetchDelete } from "@/shared/api";

type ReactionResponse = {
  message_id: string;
  reaction: "like" | "dislike";
};

export function setReaction(
  chatId: string,
  messageId: string,
  reaction: "like" | "dislike",
): Promise<ReactionResponse> {
  return fetchJson(`/v1/chats/${chatId}/messages/${messageId}/reaction`, {
    method: "PUT",
    body: JSON.stringify({ reaction }),
  });
}

export function removeReaction(
  chatId: string,
  messageId: string,
): Promise<void> {
  return fetchDelete(
    `/v1/chats/${chatId}/messages/${messageId}/reaction`,
  );
}
