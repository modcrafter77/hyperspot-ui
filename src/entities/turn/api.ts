import { fetchJson } from "@/shared/api";
import type { TurnStatus } from "./types";

export function getTurnStatus(
  chatId: string,
  requestId: string,
): Promise<TurnStatus> {
  return fetchJson(`/v1/chats/${chatId}/turns/${requestId}`);
}
