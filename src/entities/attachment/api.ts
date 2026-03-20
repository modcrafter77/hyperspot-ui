import { uploadFile, fetchJson, fetchDelete } from "@/shared/api";
import type { Attachment } from "./types";

export function uploadAttachment(
  chatId: string,
  file: File,
): Promise<Attachment> {
  return uploadFile<Attachment>(`/v1/chats/${chatId}/attachments`, file);
}

export function getAttachment(
  chatId: string,
  attachmentId: string,
): Promise<Attachment> {
  return fetchJson<Attachment>(
    `/v1/chats/${chatId}/attachments/${attachmentId}`,
  );
}

export function deleteAttachment(
  chatId: string,
  attachmentId: string,
): Promise<void> {
  return fetchDelete(`/v1/chats/${chatId}/attachments/${attachmentId}`);
}
