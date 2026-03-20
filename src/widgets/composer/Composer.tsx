import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  type KeyboardEvent,
  type DragEvent,
} from "react";
import { SendHorizonal, Paperclip, Globe, Square } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { useStreamStore } from "@/features/stream-response/stream-store";
import { useAttachmentStore } from "@/features/attachments/attachment-store";
import { AttachmentStrip } from "@/features/attachments/AttachmentStrip";
import { toast } from "sonner";

type Props = {
  chatId: string;
  chatModel: string;
  disabled?: boolean;
  onSend: (
    message: string,
    opts?: { webSearch?: boolean; attachmentIds?: string[] },
  ) => void;
  onCancel: () => void;
};

const MAX_ATTACHMENTS = 20;
const MAX_IMAGE_PER_TURN = 4;

export function Composer({
  chatId,
  chatModel,
  disabled,
  onSend,
  onCancel,
}: Props) {
  const [text, setText] = useState("");
  const [webSearch, setWebSearch] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const phase = useStreamStore((s) => s.activeTurn?.phase);
  const isStreaming = phase === "opening" || phase === "streaming";
  const wasStreamingRef = useRef(false);

  useEffect(() => {
    if (isStreaming) {
      wasStreamingRef.current = true;
    } else if (wasStreamingRef.current) {
      wasStreamingRef.current = false;
      textareaRef.current?.focus();
    }
  }, [isStreaming]);

  const allItems = useAttachmentStore((s) => s.items);
  const uploadFile = useAttachmentStore((s) => s.upload);

  const attachments = useMemo(
    () => Object.values(allItems).filter((a) => a.chatId === chatId),
    [allItems, chatId],
  );
  const readyIds = useMemo(
    () =>
      attachments
        .filter((a) => a.status === "ready")
        .map((a) => a.id),
    [attachments],
  );

  const hasReadyAttachments = readyIds.length > 0;
  const canSend =
    (text.trim().length > 0 || hasReadyAttachments) &&
    !disabled &&
    !isStreaming;

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files);
      const currentCount = attachments.length;
      if (currentCount + arr.length > MAX_ATTACHMENTS) {
        toast.error(`Maximum ${MAX_ATTACHMENTS} attachments per message`);
        return;
      }

      const imageCount =
        attachments.filter((a) => a.kind === "image").length +
        arr.filter((f) => f.type.startsWith("image/")).length;
      if (imageCount > MAX_IMAGE_PER_TURN) {
        toast.error(`Maximum ${MAX_IMAGE_PER_TURN} images per turn`);
        return;
      }

      for (const file of arr) {
        uploadFile(chatId, file);
      }
    },
    [chatId, attachments, uploadFile],
  );

  const handleSend = useCallback(() => {
    if (!canSend) return;
    const ids = readyIds.length > 0 ? readyIds : undefined;
    onSend(text.trim(), {
      webSearch: webSearch || undefined,
      attachmentIds: ids,
    });
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [canSend, text, webSearch, readyIds, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  return (
    <div
      className="border-t border-border bg-background px-4 py-3"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="mx-auto max-w-3xl">
        <div
          className={cn(
            "rounded-lg border bg-card transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border focus-within:ring-1 focus-within:ring-ring",
          )}
        >
          {/* Attachment strip */}
          <AttachmentStrip chatId={chatId} />

          {/* Drop overlay text */}
          {isDragging && (
            <div className="flex items-center justify-center py-4 text-sm text-primary">
              Drop files to attach
            </div>
          )}

          {/* Input row */}
          <div className="flex items-end gap-2 px-3 py-2">
            <button
              onClick={handleFileSelect}
              disabled={isStreaming}
              className="mb-0.5 flex-shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInputChange}
            />

            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              placeholder={
                isStreaming ? "Waiting for response..." : "Send a message..."
              }
              disabled={disabled || isStreaming}
              rows={1}
              className="max-h-[200px] min-h-[24px] flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
            />

            <div className="mb-0.5 flex flex-shrink-0 items-center gap-1">
              <button
                onClick={() => setWebSearch((v) => !v)}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  webSearch
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
                aria-label="Web search"
                title={webSearch ? "Web search enabled" : "Enable web search"}
              >
                <Globe className="h-4 w-4" />
              </button>

              {isStreaming ? (
                <button
                  onClick={onCancel}
                  className="rounded-md bg-destructive/20 p-1.5 text-destructive hover:bg-destructive/30"
                  aria-label="Stop generation"
                >
                  <Square className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className={cn(
                    "rounded-md p-1.5 transition-colors",
                    canSend
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "text-muted-foreground opacity-40",
                  )}
                  aria-label="Send message"
                >
                  <SendHorizonal className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-1.5 flex items-center justify-between px-1">
          <span className="text-[11px] text-muted-foreground">
            {chatModel}
            {webSearch && (
              <span className="ml-1.5 text-primary">+ web search</span>
            )}
            {attachments.length > 0 && (
              <span className="ml-1.5">
                · {attachments.length} file{attachments.length !== 1 && "s"}
              </span>
            )}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {isStreaming
              ? "Generating..."
              : "Enter to send, Shift+Enter for newline"}
          </span>
        </div>
      </div>
    </div>
  );
}
