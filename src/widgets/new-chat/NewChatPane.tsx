import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/app/store";
import { createChat } from "@/entities/chat/api";
import { useModels, getModelCapabilities } from "@/entities/model";
import { useIsQuotaExhausted } from "@/entities/quota";

import { queryKeys } from "@/shared/lib/query-keys";
import { sendMessage } from "@/features/send-message/sendMessage";
import { toast } from "sonner";
import { ApiError } from "@/shared/api";
import { mapApiError } from "@/shared/lib/error-messages";
import { useWindowTitle } from "@/shared/hooks/useWindowTitle";
import { cn } from "@/shared/lib/cn";
import {
  SendHorizonal,
  Globe,
  Sparkles,
  Zap,
  ChevronDown,
  Loader2,
  ImageIcon,
  FileText,
  Search,
} from "lucide-react";
import type { Model } from "@/entities/model";

export function NewChatPane() {
  useWindowTitle(null);
  const { data: modelList } = useModels();
  const models = modelList.items;

  const selectChat = useAppStore((s) => s.selectChat);
  const quotaExhausted = useIsQuotaExhausted();
  const qc = useQueryClient();

  const [selectedModel, setSelectedModel] = useState(
    () =>
      models.find((m) => m.tier === "premium")?.model_id ??
      models[0]?.model_id ??
      "",
  );
  const [text, setText] = useState("");
  const [webSearch, setWebSearch] = useState(false);
  const [sending, setSending] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);

  const currentModel = models.find((m) => m.model_id === selectedModel);
  const capabilities = getModelCapabilities(currentModel);
  const canSend = text.trim().length > 0 && !sending && !quotaExhausted;

  // Reset web search when switching to a model without support
  useEffect(() => {
    if (!capabilities.supportsWebSearch) setWebSearch(false);
  }, [capabilities.supportsWebSearch]);

  const handleSend = useCallback(async () => {
    if (!canSend || busyRef.current) return;
    busyRef.current = true;
    const content = text.trim();
    const ws = webSearch || undefined;
    setSending(true);

    try {
      const chat = await createChat({ model: selectedModel || undefined });

      // Seed caches BEFORE selectChat so ChatPane/ChatView don't fire
      // redundant fetches on mount.
      qc.setQueryData(queryKeys.chats.detail(chat.id), chat);
      qc.setQueryData(queryKeys.messages.list(chat.id), {
        pages: [{ items: [], page_info: { limit: 20, next_cursor: null } }],
        pageParams: [undefined],
      });

      selectChat(chat.id);

      await sendMessage(chat.id, content, { webSearch: ws }, qc);
    } catch (err) {
      if (err instanceof ApiError) {
        const info = mapApiError(err);
        toast.error(info.title, { description: info.detail });
      } else if (!(err instanceof DOMException && err.name === "AbortError")) {
        toast.error("Failed to create chat");
      }
      setSending(false);
      busyRef.current = false;
    }
  }, [canSend, text, selectedModel, webSearch, qc, selectChat]);

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

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-2xl px-4">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold text-foreground">
              What can I help with?
            </h1>
          </div>

          {/* Composer card */}
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-end gap-2 px-3 py-2">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={handleInput}
                placeholder="Send a message..."
                disabled={sending}
                rows={1}
                autoFocus
                className="max-h-[200px] min-h-[36px] flex-1 resize-none bg-transparent py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
              />

              <div className="mb-0.5 flex flex-shrink-0 items-center gap-1">
                <button
                  onClick={() => setWebSearch((v) => !v)}
                  disabled={!capabilities.supportsWebSearch}
                  className={cn(
                    "rounded-md p-1.5 transition-colors",
                    !capabilities.supportsWebSearch
                      ? "text-muted-foreground opacity-40"
                      : webSearch
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                  aria-label="Web search"
                  title={capabilities.supportsWebSearch ? (webSearch ? "Web search enabled" : "Enable web search") : "This model does not support web search"}
                >
                  <Globe className="h-4 w-4" />
                </button>

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
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <SendHorizonal className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Model selector + hints row */}
          <div className="mt-2 flex items-center justify-between px-1">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setModelOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                {currentModel && <TierIcon tier={currentModel.tier} />}
                {currentModel?.display_name ?? selectedModel}
                <ChevronDown className="h-3 w-3" />
              </button>

              {modelOpen && (
                <ModelDropdown
                  models={models}
                  selected={selectedModel}
                  onSelect={(id) => {
                    setSelectedModel(id);
                    setModelOpen(false);
                  }}
                  onClose={() => setModelOpen(false)}
                />
              )}
            </div>

            <span className="text-[11px] text-muted-foreground">
              {quotaExhausted ? (
                <span className="text-destructive">
                  Quota exhausted — sending disabled
                </span>
              ) : webSearch ? (
                <span>
                  Enter to send
                  <span className="ml-1.5 text-primary">+ web search</span>
                </span>
              ) : (
                "Enter to send, Shift+Enter for newline"
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModelDropdown({
  models,
  selected,
  onSelect,
  onClose,
}: {
  models: Model[];
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute bottom-full left-0 z-50 mb-1 min-w-[240px] rounded-md border border-border bg-popover py-1 shadow-lg">
        {models.map((m) => (
          <button
            key={m.model_id}
            onClick={() => onSelect(m.model_id)}
            className={cn(
              "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
              selected === m.model_id
                ? "bg-secondary text-foreground"
                : "text-popover-foreground hover:bg-secondary/50",
            )}
          >
            <TierIcon tier={m.tier} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="font-medium">{m.display_name}</span>
                <span className="ml-1 text-[11px] text-muted-foreground">
                  {m.multiplier_display}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {m.multimodal_capabilities.includes("VISION_INPUT") && (
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground" title="Supports images">
                    <ImageIcon className="h-2.5 w-2.5" />
                  </span>
                )}
                {m.multimodal_capabilities.includes("RAG") && (
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground" title="Supports file attachments">
                    <FileText className="h-2.5 w-2.5" />
                  </span>
                )}
                {m.multimodal_capabilities.includes("WEB_SEARCH") && (
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground" title="Supports web search">
                    <Search className="h-2.5 w-2.5" />
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function TierIcon({ tier }: { tier: string }) {
  if (tier === "premium") {
    return <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />;
  }
  return <Zap className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />;
}
