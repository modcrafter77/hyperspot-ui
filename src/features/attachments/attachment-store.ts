import { create } from "zustand";
import {
  uploadAttachment,
  getAttachment,
  deleteAttachment,
  type Attachment,
} from "@/entities/attachment";
import { ApiError } from "@/shared/api";

export type LocalAttachment = {
  id: string;
  chatId: string;
  file: File;
  filename: string;
  kind: "document" | "image";
  status: "uploading" | "pending" | "ready" | "failed" | "deleting";
  serverData: Attachment | null;
  error: string | null;
  pollTimer: ReturnType<typeof setTimeout> | null;
  /** Object URL for instant local image preview (revoked on remove/clear). */
  localPreviewUrl: string | null;
};

type AttachmentState = {
  items: Record<string, LocalAttachment>;
};

type AttachmentActions = {
  upload: (chatId: string, file: File) => void;
  remove: (id: string) => void;
  clearChat: (chatId: string) => void;
  getReadyIds: (chatId: string) => string[];
  getAllForChat: (chatId: string) => LocalAttachment[];
};

const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/webp"]);
const POLL_INTERVAL_MS = 2000;
const POLL_BACKOFF_MAX_MS = 15000;
const MAX_POLLS = 60;

export const useAttachmentStore = create<AttachmentState & AttachmentActions>(
  (set, get) => ({
    items: {},

    upload: (chatId, file) => {
      const tempId = `temp-${crypto.randomUUID()}`;
      const kind = IMAGE_MIMES.has(file.type) ? "image" : "document";

      const localPreviewUrl =
        kind === "image" ? URL.createObjectURL(file) : null;

      const entry: LocalAttachment = {
        id: tempId,
        chatId,
        file,
        filename: file.name,
        kind,
        status: "uploading",
        serverData: null,
        error: null,
        pollTimer: null,
        localPreviewUrl,
      };

      set((s) => ({ items: { ...s.items, [tempId]: entry } }));

      uploadAttachment(chatId, file)
        .then((attachment) => {
          const state = get();
          const existing = state.items[tempId];
          if (!existing) return;

          const realId = attachment.id;
          const updated: LocalAttachment = {
            ...existing,
            id: realId,
            status: attachment.status === "ready" ? "ready" : "pending",
            serverData: attachment,
            kind: attachment.kind,
          };

          const { [tempId]: _, ...rest } = state.items;
          set({ items: { ...rest, [realId]: updated } });

          if (attachment.status === "pending") {
            startPolling(realId, chatId, attachment.id);
          }
        })
        .catch((err) => {
          const code = err instanceof ApiError ? err.code : "";
          const UPLOAD_ERRORS: Record<string, string> = {
            quota_exceeded: "Quota exhausted — cannot upload",
            file_too_large: "File exceeds the size limit",
            unsupported_file_type: "This file type is not supported",
          };
          const message =
            UPLOAD_ERRORS[code] ||
            (err instanceof Error ? err.message : "Upload failed");
          set((s) => {
            const item = s.items[tempId];
            if (!item) return s;
            return {
              items: {
                ...s.items,
                [tempId]: { ...item, status: "failed", error: message },
              },
            };
          });
        });
    },

    remove: (id) => {
      const item = get().items[id];
      if (!item) return;

      if (item.pollTimer) clearTimeout(item.pollTimer);
      if (item.localPreviewUrl) URL.revokeObjectURL(item.localPreviewUrl);

      if (item.status === "uploading" || item.status === "failed" || id.startsWith("temp-")) {
        set((s) => {
          const { [id]: _, ...rest } = s.items;
          return { items: rest };
        });
        return;
      }

      set((s) => ({
        items: {
          ...s.items,
          [id]: { ...item, status: "deleting" },
        },
      }));

      deleteAttachment(item.chatId, id)
        .then(() => {
          set((s) => {
            const { [id]: _, ...rest } = s.items;
            return { items: rest };
          });
        })
        .catch((err) => {
          const code = err instanceof ApiError ? err.code : "";
          if (code === "attachment_locked") {
            set((s) => {
              const cur = s.items[id];
              if (!cur) return s;
              return {
                items: {
                  ...s.items,
                  [id]: { ...cur, status: "ready", error: "Attachment is locked (used in a message)" },
                },
              };
            });
          } else {
            set((s) => {
              const cur = s.items[id];
              if (!cur) return s;
              return {
                items: {
                  ...s.items,
                  [id]: {
                    ...cur,
                    status: cur.serverData?.status === "ready" ? "ready" : "failed",
                    error: err instanceof Error ? err.message : "Delete failed",
                  },
                },
              };
            });
          }
        });
    },

    clearChat: (chatId) => {
      const items = get().items;
      const remaining: Record<string, LocalAttachment> = {};
      for (const [k, v] of Object.entries(items)) {
        if (v.chatId === chatId) {
          if (v.pollTimer) clearTimeout(v.pollTimer);
          if (v.localPreviewUrl) URL.revokeObjectURL(v.localPreviewUrl);
        } else {
          remaining[k] = v;
        }
      }
      set({ items: remaining });
    },

    getReadyIds: (chatId) =>
      Object.values(get().items)
        .filter((a) => a.chatId === chatId && a.status === "ready")
        .map((a) => a.id),

    getAllForChat: (chatId) =>
      Object.values(get().items).filter((a) => a.chatId === chatId),
  }),
);

/** Compute poll delay with exponential backoff on consecutive errors.
 *  Normal polls use the base interval; error retries grow exponentially. */
function pollDelay(errorStreak: number): number {
  if (errorStreak === 0) return POLL_INTERVAL_MS;
  return Math.min(POLL_INTERVAL_MS * 2 ** errorStreak, POLL_BACKOFF_MAX_MS);
}

function startPolling(
  storeId: string,
  chatId: string,
  attachmentId: string,
  attempt = 0,
  errorStreak = 0,
) {
  if (attempt >= MAX_POLLS) {
    useAttachmentStore.setState((s) => {
      const item = s.items[storeId];
      if (!item) return s;
      return {
        items: {
          ...s.items,
          [storeId]: { ...item, status: "failed", error: "Timed out waiting for processing" },
        },
      };
    });
    return;
  }

  const timer = setTimeout(async () => {
    try {
      const attachment = await getAttachment(chatId, attachmentId);
      useAttachmentStore.setState((s) => {
        const item = s.items[storeId];
        if (!item) return s;
        return {
          items: {
            ...s.items,
            [storeId]: {
              ...item,
              serverData: attachment,
              status: attachment.status === "ready" ? "ready" : attachment.status === "failed" ? "failed" : "pending",
              error: attachment.status === "failed" ? (attachment.error_code ?? "Processing failed") : null,
            },
          },
        };
      });

      if (attachment.status === "pending") {
        // Success resets the error streak
        startPolling(storeId, chatId, attachmentId, attempt + 1, 0);
      }
    } catch {
      // Exponential backoff: each consecutive error doubles the delay
      startPolling(storeId, chatId, attachmentId, attempt + 1, errorStreak + 1);
    }
  }, pollDelay(errorStreak));

  useAttachmentStore.setState((s) => {
    const item = s.items[storeId];
    if (!item) return s;
    return {
      items: {
        ...s.items,
        [storeId]: { ...item, pollTimer: timer },
      },
    };
  });
}
